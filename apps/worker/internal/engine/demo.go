package engine

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

// MemoryRepository exists for local demos/tests only; production uses conditional DynamoDB writes.
type MemoryRepository struct {
	mu   sync.Mutex
	Data map[string]Item
}

func clone(i Item) Item {
	if i == nil {
		return nil
	}
	raw, _ := json.Marshal(i)
	var out Item
	_ = json.Unmarshal(raw, &out)
	return out
}
func NewMemoryRepository() *MemoryRepository { return &MemoryRepository{Data: map[string]Item{}} }
func (r *MemoryRepository) Get(_ context.Context, pk, sk string) (Item, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	return clone(r.Data[pk+"|"+sk]), nil
}
func (r *MemoryRepository) Commit(_ context.Context, changes []Change) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, c := range changes {
		old := r.Data[c.PK+"|"+c.SK]
		if c.Before == nil && old != nil || c.Before != nil && (old == nil || number(old["rev"]) != number(c.Before["rev"])) {
			return ErrConflict
		}
	}
	for _, c := range changes {
		i := clone(c.Value)
		i["pk"] = c.PK
		i["sk"] = c.SK
		i["rev"] = number(c.Before["rev"]) + 1
		r.Data[c.PK+"|"+c.SK] = i
	}
	return nil
}

type DemoProvider struct{ Content Content }

func (p DemoProvider) Invoke(context.Context, Prompt) (string, string, error) {
	raw, err := encode(p.Content)
	return string(raw), "end_turn", err
}

type DirectoryAssets struct{ Directory string }

func (a DirectoryAssets) Put(_ context.Context, _, _ string, _ int, files map[string]string) error {
	if a.Directory == "" {
		return errors.New("output directory required")
	}
	if err := os.MkdirAll(a.Directory, 0700); err != nil {
		return err
	}
	for _, name := range AssetNames {
		body, ok := files[name]
		if !ok {
			return errors.New("missing demo asset")
		}
		if err := os.WriteFile(filepath.Join(a.Directory, name), []byte(body), 0600); err != nil {
			return err
		}
	}
	return nil
}
