package main

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/stability"
)

// An exclusive marker reserves the single trial before any provider call.
// Unknown outcomes keep their reservation; repeating a command never spends twice.
func runImageTrial(ctx context.Context, topic, output string, provider engine.ImageProvider) error {
	return runImageTrialWithPrompt(ctx, topic, output, provider, "")
}
func runImageTrialWithPrompt(ctx context.Context, topic, output string, provider engine.ImageProvider, override string) error {
	content, err := engine.DemoContent(topic)
	if err != nil {
		return err
	}
	brief, err := engine.ImageBrief(topic, content)
	if err != nil {
		return err
	}
	if override != "" {
		brief = override
	}
	if !utf8.ValidString(brief) || len(brief) > 2400 || strings.ContainsRune(brief, 0) {
		return errors.New("invalid bounded trial prompt; no request made")
	}
	if err = os.MkdirAll(output, 0o700); err != nil {
		return errors.New("trial output directory unavailable")
	}
	imagePath := filepath.Join(output, "illustration.png")
	if _, err = os.Lstat(imagePath); err == nil {
		return errors.New("image output already exists; no request made")
	} else if !os.IsNotExist(err) {
		return errors.New("image output unavailable")
	}
	marker := filepath.Join(output, "image-attempt.json")
	f, err := os.OpenFile(marker, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return errors.New("trial already reserved or output unavailable; do not repeat an uncertain image attempt")
	}
	digest := sha256.Sum256([]byte(brief))
	record := map[string]any{"promptSha256": fmt.Sprintf("%x", digest), "provider": "stability", "model": "stable-image-core", "creditsReserved": stability.CreditCost, "topic": topic, "status": "reserved", "created": time.Now().UTC().Format(time.RFC3339)}
	err = json.NewEncoder(f).Encode(record)
	closeErr := f.Close()
	if err != nil || closeErr != nil {
		return errors.New("could not record trial reservation; no model call made")
	}
	if err = os.WriteFile(filepath.Join(output, "prompt.txt"), []byte(brief+"\n"), 0o600); err != nil {
		return errors.New("could not save trial prompt; no request made")
	}
	body, err := provider.Generate(ctx, brief)
	if err != nil {
		return err
	}
	if err = engine.ValidatePNG(body); err != nil {
		return err
	}
	out, err := os.OpenFile(imagePath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return errors.New("image output failed; reserved attempt remains counted")
	}
	_, err = out.Write(body)
	closeErr = out.Close()
	if err != nil || closeErr != nil {
		return errors.New("image output failed; the reserved attempt remains counted")
	}
	record["status"] = "completed"
	record["bytes"] = len(body)
	data, _ := json.MarshalIndent(record, "", "  ")
	if err = os.WriteFile(marker, append(data, '\n'), 0o600); err != nil {
		return errors.New("completion receipt failed; image may already exist, do not regenerate")
	}
	abs, _ := filepath.Abs(output)
	fmt.Fprintf(os.Stdout, "One Stability Core image saved in %s. Three credits reserved; no AWS calls.\n", abs)
	return nil
}
