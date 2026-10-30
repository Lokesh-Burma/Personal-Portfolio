package engine

import (
	"context"
	"errors"
	"testing"
	"time"
)

type refiningImages struct {
	calls int
	image []byte
	fail  bool
}

func (p *refiningImages) Generate(context.Context, string) ([]byte, error) {
	return nil, errors.New("must not generate from scratch")
}
func (p *refiningImages) Refine(ctx context.Context, brief string, before []byte, instructions string) ([]byte, error) {
	p.calls++
	if len(before) == 0 || instructions != "Fix arrow five" {
		return nil, errors.New("missing edit target")
	}
	ReportImageUsage(ctx, ImageUsage{Model: "gemini-nano-banana-2.1", PromptTokens: 1467, OutputTokens: 2202, ImageTokens: 1120, EstimatedUSD: 0.0439155, PricingAsOf: "2026-10-30"})
	if p.fail {
		return nil, errors.New("uncertain outcome")
	}
	return p.image, nil
}

type refinementAssets struct {
	*imageSink
	image []byte
	reads int
}

func (a *refinementAssets) LoadImage(context.Context, string, string, int) ([]byte, error) {
	a.reads++
	return a.image, nil
}
func TestRefinementUsesParentImageWithoutTextCallAndPreservesBothVersions(t *testing.T) {
	for _, fail := range []bool{false, true} {
		w, r, parent, textCalls, _ := imageSetup(t)
		ctx := context.Background()
		w.Images = imageFunc(func(context.Context, string) ([]byte, error) { return fixturePNG(t), nil })
		if err := w.Work(ctx, parent); err != nil {
			t.Fatal(err)
		}
		before := job(t, r, parent)
		textBefore := textCalls.Load()
		m := message(2)
		seed(t, r, m)
		j := job(t, r, m)
		next := copyItem(j)
		next["generateImage"] = true
		next["parentId"] = parent.ID
		next["parentRevision"] = 0
		next["refinementInstructions"] = "Fix arrow five"
		if err := r.Commit(ctx, []Change{{"OWNER#" + m.Owner, "JOB#" + m.ID, j, next}}); err != nil {
			t.Fatal(err)
		}
		w.Now = func() time.Time { return time.Date(2026, 10, 27, 12, 0, 0, 0, time.UTC) }
		p := &refiningImages{image: fixturePNG(t), fail: fail}
		w.Images = p
		w.RefineEnabled = true
		w.Assets = &refinementAssets{imageSink: w.Assets.(*imageSink), image: fixturePNG(t)}
		if err := w.Work(ctx, m); err != nil {
			t.Fatal(err)
		}
		_ = w.Work(ctx, m)
		child := job(t, r, m)
		if p.calls != 1 || textCalls.Load() != textBefore || child["content"] == nil || child["status"] != "completed" {
			t.Fatal("refinement re-generated text or repeated image")
		}
		if record, ok := child["imageUsage"].(map[string]any); !ok || record["estimatedUSD"] == nil {
			t.Fatal("known usage lost")
		}
		q, _ := r.Get(ctx, "QUOTA#IMAGES", "MONTH#2026-10")
		if number(q["count"]) != 2 || number(q["knownUsageCount"]) != 1 {
			t.Fatal("quota/known costs incorrect")
		}
		after := job(t, r, parent)
		if after["imageStatus"] != before["imageStatus"] || after["revision"] != before["revision"] {
			t.Fatal("parent overwritten")
		}
		want := "completed"
		if fail {
			want = "failed"
		}
		if child["imageStatus"] != want {
			t.Fatal("wrong refinement result")
		}
	}
}
func TestRefinementGatePreventsImageOrTextCalls(t *testing.T) {
	w, r, m, calls, _ := imageSetup(t)
	j := job(t, r, m)
	next := copyItem(j)
	next["parentId"] = message(2).ID
	_ = r.Commit(context.Background(), []Change{{"OWNER#" + m.Owner, "JOB#" + m.ID, j, next}})
	if err := w.Work(context.Background(), m); err != nil {
		t.Fatal(err)
	}
	if calls.Load() != 0 || job(t, r, m)["status"] != "failed" {
		t.Fatal("refinement gate bypassed")
	}
}

func TestNewReservationPreservesCostTotalsAndUsageIsCountedOnce(t *testing.T) {
	w, r, m, _, _ := imageSetup(t)
	ctx := context.Background()
	j := job(t, r, m)
	next := copyItem(j)
	next["status"] = "running"
	if err := r.Commit(ctx, []Change{{"OWNER#" + m.Owner, "JOB#" + m.ID, j, next}, {"QUOTA#IMAGES", "MONTH#2026-10", nil, Item{"count": 2, "knownUsageCount": 1, "knownCostUSD": 0.04}}}); err != nil {
		t.Fatal(err)
	}
	if err := w.reserveImage(ctx, m); err != nil {
		t.Fatal(err)
	}
	q, _ := r.Get(ctx, "QUOTA#IMAGES", "MONTH#2026-10")
	if q["knownCostUSD"] != 0.04 || number(q["count"]) != 3 {
		t.Fatal("reservation erased costs")
	}
	usage := ImageUsage{EstimatedUSD: 0.04, Model: "test"}
	if err := w.saveImageUsage(ctx, m, usage); err != nil {
		t.Fatal(err)
	}
	if err := w.saveImageUsage(ctx, m, usage); err != nil {
		t.Fatal(err)
	}
	q, _ = r.Get(ctx, "QUOTA#IMAGES", "MONTH#2026-10")
	if q["knownCostUSD"] != 0.08 || number(q["knownUsageCount"]) != 2 {
		t.Fatal("usage counted twice or lost")
	}
}
