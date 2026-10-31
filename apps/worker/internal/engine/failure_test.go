package engine

import (
	"context"
	"errors"
	"strings"
	"testing"
)

type diagnosticAPIError struct{}

func (diagnosticAPIError) Error() string     { return "private-provider-detail-and-secret" }
func (diagnosticAPIError) ErrorCode() string { return "ThrottlingException" }

func TestGenerationFailuresKeepStageWithoutLeakingOrRepeatingRequests(t *testing.T) {
	for _, stage := range []string{"text_generation", "text_validation", "asset_storage"} {
		t.Run(stage, func(t *testing.T) {
			w, r, m, calls, _ := setup(t)
			switch stage {
			case "text_generation":
				w.Provider = providerFunc(func(context.Context, Prompt) (string, string, error) {
					calls.Add(1)
					return "", "", diagnosticAPIError{}
				})
			case "text_validation":
				w.Provider = providerFunc(func(context.Context, Prompt) (string, string, error) {
					calls.Add(1)
					return "not json", "end_turn", nil
				})
			case "asset_storage":
				w.Assets = assetsFunc(func(context.Context, string, string, int, map[string]string) error {
					return errors.New("private-storage-detail-and-secret")
				})
			}
			if err := w.Work(context.Background(), m); err != nil {
				t.Fatal(err)
			}
			j := job(t, r, m)
			if j["status"] != "failed" || j["failureStage"] != stage || j["failureCode"] == nil {
				t.Fatalf("missing safe failure metadata: %v", j)
			}
			if stage == "text_generation" && j["failureCode"] != "ThrottlingException" {
				t.Fatal("provider code lost")
			}
			raw, _ := encode(j)
			if strings.Contains(string(raw), "private-") {
				t.Fatal("raw provider detail leaked")
			}
			if err := w.Work(context.Background(), m); err != nil {
				t.Fatal(err)
			}
			if calls.Load() != 1 {
				t.Fatal("failed delivery repeated inference")
			}
			quota, _ := r.Get(context.Background(), "QUOTA#GLOBAL", "DAY#2026-10-26")
			if number(quota["count"]) != 1 {
				t.Fatal("reservation changed")
			}
			images, _ := r.Get(context.Background(), "QUOTA#IMAGES", "DAY#2026-10-26")
			if images != nil {
				t.Fatal("pre-image failure consumed image quota")
			}
		})
	}
}

func TestSingleJSONFencePreservesStrictValidation(t *testing.T) {
	c, _ := DemoContent("Cache Aside")
	c.Sources = nil
	raw, _ := encode(c)
	for _, text := range []string{string(raw), "```json\n" + string(raw) + "\n```", "```\n" + string(raw) + "\n```"} {
		if _, err := ParseContent(text, "end_turn", "Cache Aside"); err != nil {
			t.Fatal(err)
		}
	}
	for _, text := range []string{"Explanation:\n```json\n" + string(raw) + "\n```", "```json\n" + string(raw) + "\n```\nextra", "```json\n" + string(raw) + " {}\n```", "```json\n{\"unexpected\":true}\n```"} {
		if _, err := ParseContent(text, "end_turn", "Cache Aside"); err == nil {
			t.Fatal("accepted prose, extra data or invalid schema")
		}
	}
	if _, err := ParseContent("```json\n"+string(raw)+"\n```", "max_tokens", "Cache Aside"); err == nil {
		t.Fatal("accepted incomplete response")
	}
}

func TestSuccessfulExplicitRetryClearsPreviousFailureDetails(t *testing.T) {
	w, r, m, _, _ := setup(t)
	before := job(t, r, m)
	next := copyItem(before)
	next["failureStage"] = "text_validation"
	next["failureCode"] = "invalid_json"
	next["textStopReason"] = "end_turn"
	if err := r.Commit(context.Background(), []Change{{"OWNER#" + m.Owner, "JOB#" + m.ID, before, next}}); err != nil {
		t.Fatal(err)
	}
	if err := w.Work(context.Background(), m); err != nil {
		t.Fatal(err)
	}
	j := job(t, r, m)
	if j["status"] != "completed" || j["failureStage"] != nil || j["failureCode"] != nil || j["textStopReason"] != nil {
		t.Fatal("successful job retained stale failure diagnostics")
	}
}
