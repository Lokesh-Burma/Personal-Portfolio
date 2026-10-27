package engine

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/png"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type imageFunc func(context.Context, string) ([]byte, error)

func (f imageFunc) Generate(c context.Context, p string) ([]byte, error) { return f(c, p) }

type imageSink struct {
	assetsFunc
	calls atomic.Int64
	err   error
}

func (s *imageSink) PutImage(_ context.Context, _, _ string, _ int, b []byte) error {
	s.calls.Add(1)
	return s.err
}
func fixturePNG(t *testing.T) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := png.Encode(&b, image.NewNRGBA(image.Rect(0, 0, 640, 640))); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}
func imageSetup(t *testing.T) (*Worker, *MemoryRepository, Message, *atomic.Int64, *imageSink) {
	t.Helper()
	w, r, m, _, _ := setup(t)
	ctx := context.Background()
	j := job(t, r, m)
	next := copyItem(j)
	next["generateImage"] = true
	if err := r.Commit(ctx, []Change{{"OWNER#" + m.Owner, "JOB#" + m.ID, j, next}}); err != nil {
		t.Fatal(err)
	}
	calls := &atomic.Int64{}
	body := fixturePNG(t)
	w.ImageEnabled = true
	w.Images = imageFunc(func(context.Context, string) ([]byte, error) { calls.Add(1); return body, nil })
	sink := &imageSink{assetsFunc: w.Assets.(assetsFunc)}
	w.Assets = sink
	return w, r, m, calls, sink
}
func TestImageGatePreventsAllModelCalls(t *testing.T) {
	w, r, m, calls, _ := imageSetup(t)
	w.ImageEnabled = false
	textCalls := 0
	w.Provider = providerFunc(func(context.Context, Prompt) (string, string, error) { textCalls++; return "", "", nil })
	if err := w.Work(context.Background(), m); err != nil {
		t.Fatal(err)
	}
	if textCalls != 0 || calls.Load() != 0 || job(t, r, m)["status"] != "failed" {
		t.Fatal("disabled image request made a model call")
	}
}
func TestImageReservationAndDuplicateDelivery(t *testing.T) {
	w, r, m, calls, sink := imageSetup(t)
	var wg sync.WaitGroup
	for range 8 {
		wg.Add(1)
		go func() { defer wg.Done(); _ = w.Work(context.Background(), m) }()
	}
	wg.Wait()
	_ = w.Work(context.Background(), m)
	j := job(t, r, m)
	q, _ := r.Get(context.Background(), "QUOTA#IMAGES", "MONTH#2026-10")
	if calls.Load() != 1 || sink.calls.Load() != 1 || j["status"] != "completed" || j["imageStatus"] != "completed" || number(q["count"]) != 1 {
		t.Fatal("image repeated, quota lost or completion missing")
	}
}
func TestImageFailurePreservesTextAndNeverRefundsOrRetries(t *testing.T) {
	for _, stage := range []string{"provider", "storage", "invalid"} {
		t.Run(stage, func(t *testing.T) {
			w, r, m, calls, sink := imageSetup(t)
			if stage == "storage" {
				sink.err = errors.New("storage timeout")
			} else {
				w.Images = imageFunc(func(context.Context, string) ([]byte, error) {
					calls.Add(1)
					if stage == "invalid" {
						return []byte("not a PNG"), nil
					}
					return nil, errors.New("unknown timeout")
				})
			}
			for range 2 {
				if err := w.Work(context.Background(), m); err != nil {
					t.Fatal(err)
				}
			}
			j := job(t, r, m)
			q, _ := r.Get(context.Background(), "QUOTA#IMAGES", "DAY#2026-10-26")
			if calls.Load() != 1 || number(q["count"]) != 1 || j["status"] != "completed" || j["imageStatus"] != "failed" || j["content"] == nil {
				t.Fatal("failed image retried/refunded or text discarded")
			}
		})
	}
}
func TestImageDailyAndMonthlyQuotaBlockInvocation(t *testing.T) {
	for _, sk := range []string{"DAY#2026-10-26", "MONTH#2026-10"} {
		t.Run(sk, func(t *testing.T) {
			w, r, m, calls, _ := imageSetup(t)
			limit := ImageDailyLimit
			if sk[0] == 'M' {
				limit = ImageMonthlyLimit
			}
			_ = r.Commit(context.Background(), []Change{{"QUOTA#IMAGES", sk, nil, Item{"count": limit}}})
			if err := w.Work(context.Background(), m); err != nil {
				t.Fatal(err)
			}
			if calls.Load() != 0 || job(t, r, m)["imageStatus"] != "failed" {
				t.Fatal("image quota exceeded")
			}
		})
	}
}
func TestUnknownImageReservationOutcomeNeverInvokes(t *testing.T) {
	w, r, m, calls, _ := imageSetup(t)
	w.Repo = repoWrapper{Repository: r, commit: func(c context.Context, changes []Change) error {
		err := r.Commit(c, changes)
		if err == nil && len(changes) == 3 && changes[1].PK == "QUOTA#IMAGES" {
			return errors.New("reservation acknowledgement lost")
		}
		return err
	}}
	if err := w.Work(context.Background(), m); err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 0 || job(t, r, m)["status"] != "completed" {
		t.Fatal("unknown image reservation called provider")
	}
}
func TestPNGValidationAndBriefBounds(t *testing.T) {
	if err := ValidatePNG(fixturePNG(t)); err != nil {
		t.Fatal(err)
	}
	for _, body := range [][]byte{nil, []byte("<svg/>"), make([]byte, ImageByteLimit+1), fixturePNG(t)[:40]} {
		if ValidatePNG(body) == nil {
			t.Fatal("invalid image accepted")
		}
	}
	c, _ := DemoContent("Cache Aside")
	brief, err := ImageBrief("Cache Aside", c)
	if err != nil || len(brief) > 2400 {
		t.Fatal("invalid visual brief")
	}
}

func TestInterruptedImagePreservesTextCheckpointWithoutRepeatingCalls(t *testing.T) {
	w, r, m, calls, _ := imageSetup(t)
	w.Repo = repoWrapper{Repository: r, commit: func(c context.Context, changes []Change) error {
		if changes[0].Value["status"] == "completed" {
			return errors.New("completion storage unavailable")
		}
		return r.Commit(c, changes)
	}}
	if err := w.Work(context.Background(), m); err == nil {
		t.Fatal("failed completion must be redelivered")
	}
	saved := job(t, r, m)
	if saved["content"] == nil || saved["status"] != "running" {
		t.Fatal("text checkpoint missing")
	}
	w.Repo = r
	w.Now = func() time.Time { return time.Date(2026, 10, 26, 12, 4, 0, 0, time.UTC) }
	if err := w.Work(context.Background(), m); err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 1 || job(t, r, m)["status"] != "completed" || job(t, r, m)["content"] == nil || job(t, r, m)["imageStatus"] != "failed" {
		t.Fatal("interrupted image lost text or repeated inference")
	}
}
func TestImageQuotaIsAtomicAcrossDifferentJobs(t *testing.T) {
	w, r, m, calls, _ := imageSetup(t)
	other := message(2)
	seed(t, r, other)
	j := job(t, r, other)
	next := copyItem(j)
	next["generateImage"] = true
	if err := r.Commit(context.Background(), []Change{{"OWNER#" + other.Owner, "JOB#" + other.ID, j, next}}); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for _, n := range []Message{m, other} {
		wg.Add(1)
		go func(n Message) { defer wg.Done(); _ = w.Work(context.Background(), n) }(n)
	}
	wg.Wait()
	if calls.Load() != 1 {
		t.Fatal("concurrent jobs exceeded image daily limit")
	}
}

func TestSingleJobTrialRejectsOtherJobsAndRevisionsBeforeAnyCall(t *testing.T) {
	w, r, m, calls, _ := imageSetup(t)
	w.TrialJobID = m.ID
	if w.Work(context.Background(), message(2)) == nil {
		t.Fatal("other job accepted by trial")
	}
	revised := m
	revised.Revision = 1
	if w.Work(context.Background(), revised) == nil {
		t.Fatal("second paid attempt accepted by trial")
	}
	if calls.Load() != 0 || job(t, r, m)["status"] != "queued" {
		t.Fatal("trial rejection mutated approved job")
	}
	if err := w.Work(context.Background(), m); err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 1 {
		t.Fatal("approved trial did not run once")
	}
}
