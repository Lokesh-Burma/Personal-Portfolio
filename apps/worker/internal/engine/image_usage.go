package engine

import (
	"context"
	"encoding/json"
)

// Usage-based price estimate, not a provider invoice or prepaid balance.
type ImageUsage struct {
	Model        string  `json:"model"`
	PromptTokens int64   `json:"promptTokens"`
	OutputTokens int64   `json:"outputTokens"`
	ImageTokens  int64   `json:"imageTokens"`
	EstimatedUSD float64 `json:"estimatedUSD"`
	PricingAsOf  string  `json:"pricingAsOf"`
}
type usageKey struct{}

func WithImageUsage(ctx context.Context, record func(ImageUsage)) context.Context {
	return context.WithValue(ctx, usageKey{}, record)
}
func ReportImageUsage(ctx context.Context, u ImageUsage) {
	if record, ok := ctx.Value(usageKey{}).(func(ImageUsage)); ok {
		record(u)
	}
}
func (w *Worker) saveImageUsage(ctx context.Context, m Message, u ImageUsage) error {
	return w.retry(func() error {
		pk := "OWNER#" + m.Owner
		j, err := w.Repo.Get(ctx, pk, "JOB#"+m.ID)
		if err != nil {
			return err
		}
		if j == nil || j["status"] != "running" || number(j["revision"]) != int64(m.Revision) || j["imageUsage"] != nil {
			return nil
		}
		month, ok := j["imageAttemptMonth"].(string)
		if !ok {
			return nil
		}
		before, err := w.Repo.Get(ctx, "QUOTA#IMAGES", "MONTH#"+month)
		if err != nil {
			return err
		}
		next := copyItem(j)
		raw, err := json.Marshal(u)
		if err != nil {
			return err
		}
		var stored map[string]any
		if err = json.Unmarshal(raw, &stored); err != nil {
			return err
		}
		next["imageUsage"] = stored
		total := copyItem(before)
		cost, _ := before["knownCostUSD"].(float64)
		total["knownCostUSD"] = cost + u.EstimatedUSD
		total["knownUsageCount"] = number(before["knownUsageCount"]) + 1
		return w.Repo.Commit(ctx, []Change{{pk, "JOB#" + m.ID, j, next}, {"QUOTA#IMAGES", "MONTH#" + month, before, total}})
	})
}
