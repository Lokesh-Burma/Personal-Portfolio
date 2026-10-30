package awsio

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"strings"
	"testing"

	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type referenceReader struct {
	body  []byte
	calls int
	err   error
	input *s3.GetObjectInput
}

func (r *referenceReader) GetObject(_ context.Context, in *s3.GetObjectInput, _ ...func(*s3.Options)) (*s3.GetObjectOutput, error) {
	r.calls++
	r.input = in
	if r.err != nil {
		return nil, r.err
	}
	return &s3.GetObjectOutput{Body: io.NopCloser(bytes.NewReader(r.body))}, nil
}
func TestHashPinnedPrivateReference(t *testing.T) {
	body := pngFixture(t)
	sum := sha256.Sum256(body)
	key := "style-references/" + hex.EncodeToString(sum[:]) + ".png"
	client := &referenceReader{body: body}
	r := &StyleReference{Bucket: "private", Key: key, Client: client}
	got, mime, err := r.Load(context.Background())
	if err != nil || !bytes.Equal(got, body) || mime != "image/png" || client.calls != 1 || aws.ToString(client.input.Bucket) != "private" || aws.ToString(client.input.Key) != key {
		t.Fatal("private pinned image rejected", err)
	}
	client.body = []byte("different image")
	if _, _, err = r.Load(context.Background()); err == nil {
		t.Fatal("hash mismatch accepted")
	}
	client.err = errors.New("secret storage details")
	if _, _, err = r.Load(context.Background()); err == nil || strings.Contains(err.Error(), "secret") {
		t.Fatal("storage details leaked")
	}
	for _, bad := range []string{"https://example.com/image.png", "../image.png", "owners/other/image.png", "style-references/" + strings.Repeat("a", 64) + ".gif"} {
		client.calls = 0
		r.Key = bad
		if _, _, err = r.Load(context.Background()); err == nil || client.calls != 0 {
			t.Fatal("untrusted reference reached storage")
		}
	}
	client.err = nil
	client.body = make([]byte, engine.ImageByteLimit+1)
	r.Key = key
	if _, _, err = r.Load(context.Background()); err == nil {
		t.Fatal("oversized reference accepted")
	}
}
func TestGeminiReferenceKeyIsDeploymentControlled(t *testing.T) {
	env := map[string]string{"TECHCANVAS_GO_WORKER_ENABLED": "true", "CLOUD_BACKEND_READY": "true", "BEDROCK_USAGE_APPROVED": "true", "OWNER_SUBJECT": "11111111-1111-4111-8111-111111111111", "TABLE_NAME": "table", "ASSETS_BUCKET": "bucket", "IMAGE_PROVIDER": "gemini", "GEMINI_IMAGE_USAGE_APPROVED": "true", "GEMINI_API_KEY": "unused-gemini-test-credential", "GEMINI_STYLE_REFERENCE_KEY": "https://untrusted.invalid/image.png"}
	get := func(k string) string { return env[k] }
	if _, err := SettingsFrom(get); err == nil {
		t.Fatal("URL accepted")
	}
	env["GEMINI_STYLE_REFERENCE_KEY"] = "style-references/" + strings.Repeat("a", 64) + ".jpg"
	s, err := SettingsFrom(get)
	if err != nil || s.GeminiStyleReferenceKey != env["GEMINI_STYLE_REFERENCE_KEY"] {
		t.Fatal("valid reference config rejected", err)
	}
	env["GEMINI_IMAGE_USAGE_APPROVED"] = "false"
	s, err = SettingsFrom(get)
	if err != nil || s.GeminiStyleReferenceKey != "" {
		t.Fatal("disabled images loaded private config")
	}
}
