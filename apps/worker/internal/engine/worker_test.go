package engine

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"io"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type providerFunc func(context.Context, Prompt) (string, string, error)

func (f providerFunc) Invoke(c context.Context, p Prompt) (string, string, error) { return f(c, p) }

type assetsFunc func(context.Context, string, string, int, map[string]string) error

func (f assetsFunc) Put(c context.Context, o, id string, r int, files map[string]string) error {
	return f(c, o, id, r, files)
}

type repoWrapper struct {
	Repository
	commit func(context.Context, []Change) error
}

func (r repoWrapper) Commit(c context.Context, v []Change) error { return r.commit(c, v) }

const testOwner = "11111111-1111-4111-8111-111111111111"

func message(n int) Message {
	return Message{Owner: testOwner, ID: fmt.Sprintf("0000000000-22222222-2222-4222-8222-%012d", n), Revision: 0}
}
func seed(t *testing.T, r *MemoryRepository, m Message) {
	t.Helper()
	ctx := context.Background()
	slots, _ := r.Get(ctx, "OWNER#"+m.Owner, "QUEUE")
	if err := r.Commit(ctx, []Change{{"OWNER#" + m.Owner, "JOB#" + m.ID, nil, Item{"kind": "job", "owner": m.Owner, "id": m.ID, "topic": "Cache Aside", "status": "queued", "revision": m.Revision, "attempts": 0}}, {"OWNER#" + m.Owner, "QUEUE", slots, Item{"kind": "slots", "count": number(slots["count"]) + 1}}}); err != nil {
		t.Fatal(err)
	}
}
func setup(t *testing.T) (*Worker, *MemoryRepository, Message, *atomic.Int64, *atomic.Int64) {
	t.Helper()
	r := NewMemoryRepository()
	m := message(1)
	seed(t, r, m)
	calls, puts := &atomic.Int64{}, &atomic.Int64{}
	c, _ := DemoContent("Cache Aside")
	raw, _ := encode(c)
	w := &Worker{Repo: r, Enabled: true, Demo: true, Now: func() time.Time { return time.Date(2026, 10, 26, 12, 0, 0, 0, time.UTC) }, Provider: providerFunc(func(context.Context, Prompt) (string, string, error) {
		calls.Add(1)
		return string(raw), "end_turn", nil
	}), Assets: assetsFunc(func(_ context.Context, _, _ string, _ int, files map[string]string) error {
		puts.Add(1)
		if len(files) != 8 {
			t.Errorf("asset count=%d", len(files))
		}
		return nil
	})}
	return w, r, m, calls, puts
}
func job(t *testing.T, r *MemoryRepository, m Message) Item {
	t.Helper()
	j, err := r.Get(context.Background(), "OWNER#"+m.Owner, "JOB#"+m.ID)
	if err != nil {
		t.Fatal(err)
	}
	return j
}
func TestDuplicateDeliveryChargesAndRendersOnce(t *testing.T) {
	w, r, m, calls, puts := setup(t)
	var wg sync.WaitGroup
	for range 16 {
		wg.Add(1)
		go func() { defer wg.Done(); _ = w.Work(context.Background(), m) }()
	}
	wg.Wait()
	if err := w.Work(context.Background(), m); err != nil {
		t.Fatal(err)
	}
	j := job(t, r, m)
	if calls.Load() != 1 || puts.Load() != 1 || j["status"] != "completed" || number(j["attempts"]) != 1 {
		t.Fatalf("bad outcome calls=%d puts=%d status=%v", calls.Load(), puts.Load(), j["status"])
	}
	c := j["content"].(map[string]any)
	if c["paragraph"] == nil {
		t.Fatal("content must preserve lower-case JSON contract")
	}
	slots, _ := r.Get(context.Background(), "OWNER#"+m.Owner, "QUEUE")
	if number(slots["count"]) != 0 {
		t.Fatal("slot not released")
	}
}
func TestDailyQuotaAtomicUnderContention(t *testing.T) {
	w, r, m, calls, _ := setup(t)
	_ = r.Commit(context.Background(), []Change{{"QUOTA#GLOBAL", "DAY#2026-10-26", nil, Item{"count": 19}}})
	messages := []Message{m}
	for i := 2; i <= 5; i++ {
		n := message(i)
		seed(t, r, n)
		messages = append(messages, n)
	}
	var wg sync.WaitGroup
	for _, n := range messages {
		wg.Add(1)
		go func(n Message) { defer wg.Done(); _ = w.Work(context.Background(), n) }(n)
	}
	wg.Wait()
	for _, n := range messages {
		_ = w.Work(context.Background(), n)
	}
	d, _ := r.Get(context.Background(), "QUOTA#GLOBAL", "DAY#2026-10-26")
	if calls.Load() != 1 || number(d["count"]) != 20 {
		t.Fatalf("quota exceeded: calls=%d count=%v", calls.Load(), d["count"])
	}
}
func TestMonthlyQuotaBlocksBeforeModel(t *testing.T) {
	w, r, m, calls, _ := setup(t)
	_ = r.Commit(context.Background(), []Change{{"QUOTA#GLOBAL", "MONTH#2026-10", nil, Item{"count": 300}}})
	if err := w.Work(context.Background(), m); err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 0 || job(t, r, m)["status"] != "failed" {
		t.Fatal("monthly budget guard failed")
	}
}
func TestTimeoutConsumesReservationAndNoAutomaticRetry(t *testing.T) {
	w, r, m, calls, _ := setup(t)
	w.Provider = providerFunc(func(context.Context, Prompt) (string, string, error) {
		calls.Add(1)
		return "", "", errors.New("ambiguous timeout")
	})
	for range 2 {
		if err := w.Work(context.Background(), m); err != nil {
			t.Fatal(err)
		}
	}
	d, _ := r.Get(context.Background(), "QUOTA#GLOBAL", "DAY#2026-10-26")
	if calls.Load() != 1 || number(d["count"]) != 1 || job(t, r, m)["status"] != "failed" {
		t.Fatal("attempt retried or refunded")
	}
}
func TestAmbiguousReservationNeverCallsModel(t *testing.T) {
	w, r, m, calls, _ := setup(t)
	once := true
	w.Repo = repoWrapper{Repository: r, commit: func(c context.Context, changes []Change) error {
		err := r.Commit(c, changes)
		if err == nil && once && len(changes) == 3 {
			once = false
			return errors.New("response lost")
		}
		return err
	}}
	if err := w.Work(context.Background(), m); err == nil {
		t.Fatal("uncertain commit must be redelivered")
	}
	if calls.Load() != 0 {
		t.Fatal("model invoked after uncertain transaction")
	}
	if err := w.Work(context.Background(), m); err == nil {
		t.Fatal("live lease must fail delivery")
	}
	w.Now = func() time.Time { return time.Date(2026, 10, 26, 12, 4, 0, 0, time.UTC) }
	if err := w.Work(context.Background(), m); err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 0 || job(t, r, m)["status"] != "failed" {
		t.Fatal("interrupted attempt retried")
	}
}
func TestAmbiguousSuccessAcknowledgementNeverRepeatsModel(t *testing.T) {
	w, r, m, calls, _ := setup(t)
	w.Repo = repoWrapper{Repository: r, commit: func(c context.Context, changes []Change) error {
		err := r.Commit(c, changes)
		if err == nil && changes[0].Value["status"] == "completed" {
			return errors.New("success acknowledgement lost")
		}
		return err
	}}
	if err := w.Work(context.Background(), m); err == nil {
		t.Fatal("must redeliver ambiguous success")
	}
	if err := w.Work(context.Background(), m); err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 1 {
		t.Fatal("duplicate model call")
	}
}
func TestMalformedModelOutputNeverWritesAssets(t *testing.T) {
	for _, variant := range []string{"truncated", "unknown", "oversized", "invalid-json"} {
		t.Run(variant, func(t *testing.T) {
			w, r, m, _, puts := setup(t)
			c, _ := DemoContent("Cache Aside")
			raw, _ := encode(c)
			stop := "end_turn"
			switch variant {
			case "truncated":
				stop = "max_tokens"
			case "unknown":
				raw = []byte(`{"sentence":"x","paragraph":"x","example":"x","tradeoff":"x","concepts":[],"extra":true}`)
			case "oversized":
				raw = []byte(strings.Repeat("x", 24001))
			default:
				raw = []byte("not json")
			}
			w.Provider = providerFunc(func(context.Context, Prompt) (string, string, error) { return string(raw), stop, nil })
			if err := w.Work(context.Background(), m); err != nil {
				t.Fatal(err)
			}
			if puts.Load() != 0 || job(t, r, m)["status"] != "failed" {
				t.Fatal("invalid output published")
			}
		})
	}
}
func TestHandlerRejectsDisabledAndPreservesFIFOAfterFailure(t *testing.T) {
	h := Handler(&Worker{}, testOwner)
	if _, err := h(context.Background(), events.SQSEvent{}); !errors.Is(err, ErrDisabled) {
		t.Fatal("disabled worker acknowledged")
	}
	w, _, m, calls, _ := setup(t)
	body, _ := json.Marshal(m)
	response, err := Handler(w, testOwner)(context.Background(), events.SQSEvent{Records: []events.SQSMessage{{MessageId: "bad", Body: "{}", Attributes: map[string]string{"MessageGroupId": "wrong"}}, {MessageId: "later", Body: string(body), Attributes: map[string]string{"MessageGroupId": "owner"}}}})
	if err != nil || len(response.BatchItemFailures) != 2 || calls.Load() != 0 {
		t.Fatal("FIFO failure ordering lost")
	}
}
func TestHandlerOwnerAndMessageValidation(t *testing.T) {
	for _, body := range []string{`{}`, `{"owner":"other","id":"x","revision":0}`, `{"owner":"` + testOwner + `","id":"x","revision":0.5}`, `{"owner":"` + testOwner + `","id":"x","revision":2}`, `{"owner":"` + testOwner + `","id":"x","revision":0,"extra":true}`} {
		w, _, _, calls, _ := setup(t)
		response, err := Handler(w, testOwner)(context.Background(), events.SQSEvent{Records: []events.SQSMessage{{MessageId: "bad", Body: body, Attributes: map[string]string{"MessageGroupId": "owner"}}}})
		if err != nil || len(response.BatchItemFailures) != 1 || calls.Load() != 0 {
			t.Fatalf("accepted invalid message: %s", body)
		}
	}
}
func TestContentLimitsTrustedSourcesAndXMLSafety(t *testing.T) {
	if err := CheckPrompt(Prompt{System: []TextBlock{{Text: strings.Repeat("漢", 2100)}}}); err == nil {
		t.Fatal("UTF-8 prompt cap failed")
	}
	c, _ := DemoContent("Cache Aside")
	raw, _ := encode(c)
	parsed, err := ParseContent(string(raw), "end_turn", "Database Indexing!")
	if err != nil || len(parsed.Sources) != 1 {
		t.Fatal("trusted grounding missing")
	}
	parsed.Concepts = append([]Concept(nil), parsed.Concepts...)
	parsed.Concepts[0].Title = "<script>alert(1)</script>"
	files, err := Render("<unsafe & topic>", parsed, true)
	if err != nil {
		t.Fatal(err)
	}
	for name, s := range files {
		if strings.HasSuffix(name, ".svg") {
			if strings.Contains(s, "<script>") {
				t.Fatal("unescaped SVG")
			}
			d := xml.NewDecoder(strings.NewReader(s))
			for {
				_, e := d.Token()
				if e == io.EOF {
					break
				}
				if e != nil {
					t.Fatal(e)
				}
			}
		}
	}
	var post map[string]any
	if err = json.Unmarshal([]byte(files["portfolio.json"]), &post); err != nil || post["status"] != "draft" {
		t.Fatal("export publication status must be draft")
	}
}
