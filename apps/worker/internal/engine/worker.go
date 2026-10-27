package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"time"
)

var ErrConflict = errors.New("conditional transaction conflict")
var ErrDisabled = errors.New("Go worker disabled")

type Item map[string]any
type Change struct {
	PK, SK string
	Before Item
	Value  Item
}
type Repository interface {
	Get(context.Context, string, string) (Item, error)
	Commit(context.Context, []Change) error
}
type Provider interface {
	Invoke(context.Context, Prompt) (string, string, error)
}
type Assets interface {
	Put(context.Context, string, string, int, map[string]string) error
}
type Message struct {
	Owner    string `json:"owner"`
	ID       string `json:"id"`
	Revision int    `json:"revision"`
}
type Worker struct {
	Repo         Repository
	Provider     Provider
	Images       ImageProvider
	ImageEnabled bool
	TrialJobID   string
	Assets       Assets
	Now          func() time.Time
	Enabled      bool
	Demo         bool
}

var JobID = regexp.MustCompile(`^[a-z0-9]{10}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$`)

func number(v any) int64 {
	switch n := v.(type) {
	case int:
		return int64(n)
	case int64:
		return n
	case float64:
		return int64(n)
	case json.Number:
		i, _ := n.Int64()
		return i
	default:
		return 0
	}
}
func copyItem(i Item) Item {
	out := Item{}
	for k, v := range i {
		out[k] = v
	}
	return out
}
func (w *Worker) now() time.Time {
	if w.Now != nil {
		return w.Now().UTC()
	}
	return time.Now().UTC()
}
func (w *Worker) retry(fn func() error) error {
	for range 5 {
		err := fn()
		if !errors.Is(err, ErrConflict) {
			return err
		}
	}
	return ErrConflict
}
func (w *Worker) finish(ctx context.Context, m Message, status, expected string, extra Item) error {
	return w.retry(func() error {
		pk := "OWNER#" + m.Owner
		j, err := w.Repo.Get(ctx, pk, "JOB#"+m.ID)
		if err != nil {
			return err
		}
		slots, err := w.Repo.Get(ctx, pk, "QUEUE")
		if err != nil {
			return err
		}
		if j == nil || j["status"] != expected || number(j["revision"]) != int64(m.Revision) {
			return nil
		}
		next := copyItem(j)
		next["status"] = status
		next["updated"] = w.now().Format(time.RFC3339Nano)
		for k, v := range extra {
			next[k] = v
		}
		count := number(slots["count"]) - 1
		if count < 0 {
			count = 0
		}
		return w.Repo.Commit(ctx, []Change{{pk, "JOB#" + m.ID, j, next}, {pk, "QUEUE", slots, Item{"kind": "slots", "count": count}}})
	})
}

var errQuota = errors.New("AI quota exhausted. No model call was made.")

func (w *Worker) reserve(ctx context.Context, m Message, bytes int) (Item, error) {
	var running Item
	err := w.retry(func() error {
		running = nil
		t := w.now()
		pk := "OWNER#" + m.Owner
		j, err := w.Repo.Get(ctx, pk, "JOB#"+m.ID)
		if err != nil {
			return err
		}
		day, err := w.Repo.Get(ctx, "QUOTA#GLOBAL", "DAY#"+t.Format("2006-01-02"))
		if err != nil {
			return err
		}
		month, err := w.Repo.Get(ctx, "QUOTA#GLOBAL", "MONTH#"+t.Format("2006-01"))
		if err != nil {
			return err
		}
		if j == nil || j["status"] != "queued" || number(j["revision"]) != int64(m.Revision) {
			return nil
		}
		if number(day["count"]) >= 20 || number(month["count"]) >= 300 {
			return errQuota
		}
		next := copyItem(j)
		next["status"] = "running"
		next["attempts"] = number(j["attempts"]) + 1
		next["inputBytes"] = bytes
		next["leaseUntil"] = t.Add(3 * time.Minute).UnixMilli()
		next["updated"] = t.Format(time.RFC3339Nano)
		err = w.Repo.Commit(ctx, []Change{{pk, "JOB#" + m.ID, j, next}, {"QUOTA#GLOBAL", "DAY#" + t.Format("2006-01-02"), day, Item{"kind": "quota", "count": number(day["count"]) + 1, "expiresAt": t.Add(60 * 24 * time.Hour).Unix()}}, {"QUOTA#GLOBAL", "MONTH#" + t.Format("2006-01"), month, Item{"kind": "quota", "count": number(month["count"]) + 1, "expiresAt": t.Add(400 * 24 * time.Hour).Unix()}}})
		if err == nil {
			running = next
		}
		return err
	})
	return running, err
}
func (w *Worker) Work(ctx context.Context, m Message) error {
	if !w.Enabled {
		return ErrDisabled
	}
	if w.TrialJobID != "" && (m.ID != w.TrialJobID || m.Revision != 0) {
		return errors.New("job is outside the approved single-attempt trial")
	}
	if !JobID.MatchString(m.ID) || m.Owner == "" || m.Revision < 0 || m.Revision >= 2 {
		return errors.New("invalid queue message")
	}
	pk := "OWNER#" + m.Owner
	j, err := w.Repo.Get(ctx, pk, "JOB#"+m.ID)
	if err != nil {
		return err
	}
	if j == nil || number(j["revision"]) != int64(m.Revision) || j["status"] == "completed" || j["status"] == "failed" {
		return nil
	}
	if j["status"] == "running" {
		if w.now().UnixMilli() < number(j["leaseUntil"]) {
			return errors.New("attempt still in progress")
		}
		if j["generateImage"] == true && j["content"] != nil && number(j["assetRevision"]) == int64(m.Revision) {
			return w.finish(ctx, m, "completed", "running", Item{"imageStatus": "failed", "imageError": "The image attempt was interrupted. Its outcome is unknown; the saved text pack was preserved and no model call was repeated."})
		}
		return w.finish(ctx, m, "failed", "running", Item{"error": "The prior attempt was interrupted. Its outcome is unknown; no automatic model retry was made."})
	}
	wantsImage, _ := j["generateImage"].(bool)
	if wantsImage {
		if _, ok := w.Assets.(ImageAssets); !w.ImageEnabled || w.Images == nil || !ok {
			return w.finish(ctx, m, "failed", "queued", Item{"error": "Image generation awaits separate activation approval. No model call was made."})
		}
	}
	topic, ok := j["topic"].(string)
	if !ok {
		return errors.New("invalid stored topic")
	}
	prompt, input, err := BuildPrompt(topic)
	if err != nil {
		return w.finish(ctx, m, "failed", "queued", Item{"error": err.Error()})
	}
	running, err := w.reserve(ctx, m, input)
	if errors.Is(err, errQuota) {
		return w.finish(ctx, m, "failed", "queued", Item{"error": errQuota.Error()})
	}
	if err != nil {
		return err
	}
	if running == nil {
		return nil
	}
	// Never refund a reservation or retry a potentially completed inference call.
	text, stop, err := w.Provider.Invoke(ctx, prompt)
	var content Content
	var files map[string]string
	if err == nil {
		content, err = ParseContent(text, stop, topic)
	}
	if err == nil {
		files, err = Render(topic, content, w.Demo)
	}
	if err == nil {
		err = w.Assets.Put(ctx, m.Owner, m.ID, m.Revision, files)
	}
	if err != nil {
		return w.finish(ctx, m, "failed", "running", Item{"error": "Generation or asset storage failed. This reserved attempt remains counted. You may explicitly retry once."})
	}
	raw, err := encode(content)
	if err != nil {
		return err
	}
	var stored map[string]any
	if err = json.Unmarshal(raw, &stored); err != nil {
		return err
	}
	extra := Item{"content": stored, "assetRevision": m.Revision}
	if wantsImage {
		if err = w.checkpointText(ctx, m, stored); err != nil {
			return err
		}
		if imageErr := w.generateImage(ctx, m, topic, content); imageErr != nil {
			extra["imageStatus"] = "failed"
			extra["imageError"] = "Image generation or storage failed, or its quota was exhausted. Any reserved image attempt remains counted. No automatic image retry was made."
		} else {
			extra["imageStatus"] = "completed"
		}
	}
	return w.finish(ctx, m, "completed", "running", extra)
}
func (m Message) String() string { return fmt.Sprintf("job revision %d", m.Revision) }
