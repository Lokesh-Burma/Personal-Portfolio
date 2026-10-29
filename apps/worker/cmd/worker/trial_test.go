package main

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

type trialProvider struct {
	calls int
	body  []byte
	err   error
}

func (p *trialProvider) Generate(context.Context, string) ([]byte, error) {
	p.calls++
	return p.body, p.err
}
func TestTrialRunsOnceAndRefusesDuplicateSpend(t *testing.T) {
	var b bytes.Buffer
	_ = png.Encode(&b, image.NewNRGBA(image.Rect(0, 0, 640, 640)))
	p := &trialProvider{body: b.Bytes()}
	dir := t.TempDir()
	if err := runImageTrial(context.Background(), "Cache Aside", dir, p); err != nil {
		t.Fatal(err)
	}
	if runImageTrial(context.Background(), "Cache Aside", dir, p) == nil || p.calls != 1 {
		t.Fatal("trial repeated provider request")
	}
	image, err := os.ReadFile(filepath.Join(dir, "illustration.png"))
	if err != nil || !bytes.Equal(image, b.Bytes()) {
		t.Fatal("image not saved")
	}
	for _, name := range []string{"illustration.png", "image-attempt.json"} {
		info, _ := os.Stat(filepath.Join(dir, name))
		if info.Mode().Perm() != 0o600 {
			t.Fatal("private trial file permissions lost")
		}
	}
}
func TestTrialUnknownOutcomeRetainsReservation(t *testing.T) {
	p := &trialProvider{err: errors.New("outcome unknown")}
	dir := t.TempDir()
	for range 2 {
		if runImageTrial(context.Background(), "Cache Aside", dir, p) == nil {
			t.Fatal("failure not reported")
		}
	}
	if p.calls != 1 {
		t.Fatal("unknown result automatically retried")
	}
	if _, err := os.Stat(filepath.Join(dir, "image-attempt.json")); err != nil {
		t.Fatal("reservation missing")
	}
}
func TestTrialRejectsInvalidTopicBeforeProvider(t *testing.T) {
	p := &trialProvider{}
	if runImageTrial(context.Background(), "not a curated topic", t.TempDir(), p) == nil || p.calls != 0 {
		t.Fatal("unknown topic reached provider")
	}
}
