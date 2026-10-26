package awsio

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"image"
	"image/png"
	"io"
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
)

type fakeImage struct {
	calls int
	input *bedrockruntime.InvokeModelInput
	body  []byte
	err   error
}

func (f *fakeImage) InvokeModel(_ context.Context, in *bedrockruntime.InvokeModelInput, _ ...func(*bedrockruntime.Options)) (*bedrockruntime.InvokeModelOutput, error) {
	f.calls++
	f.input = in
	return &bedrockruntime.InvokeModelOutput{Body: f.body}, f.err
}
func pngFixture(t *testing.T) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := png.Encode(&b, image.NewNRGBA(image.Rect(0, 0, 640, 640))); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}
func TestImageAdapterGatesAndSingleBoundedCall(t *testing.T) {
	f := &fakeImage{}
	p := &ImageProvider{Client: f, Region: ImageRegion}
	if _, err := p.Generate(context.Background(), "brief"); err == nil || f.calls != 0 {
		t.Fatal("unapproved inference reached SDK")
	}
	p.Approved = true
	p.Region = Region
	if _, err := p.Generate(context.Background(), "brief"); err == nil || f.calls != 0 {
		t.Fatal("unapproved region accepted")
	}
	p.Region = ImageRegion
	f.err = errors.New("timeout")
	_, _ = p.Generate(context.Background(), "brief")
	if f.calls != 1 || aws.ToString(f.input.ModelId) != ImageModel {
		t.Fatal("image call retried or wrong model")
	}
	var request map[string]any
	_ = json.Unmarshal(f.input.Body, &request)
	if request["output_format"] != "png" || request["aspect_ratio"] != "1:1" || len(request) != 3 {
		t.Fatal("unbounded image parameters")
	}
	_, _ = p.Generate(context.Background(), strings.Repeat("x", 2401))
	if f.calls != 1 {
		t.Fatal("oversized brief reached SDK")
	}
}
func TestImageResponseValidation(t *testing.T) {
	body := pngFixture(t)
	good, _ := json.Marshal(map[string]any{"images": []string{base64.StdEncoding.EncodeToString(body)}, "finish_reasons": []any{nil}})
	for _, raw := range [][]byte{good, []byte(`{"images":["a"],"finish_reasons":["Filter reason: output image"]}`), []byte(`{"images":["a"]}`), []byte(`{"images":["a"],"finish_reasons":[null]}`), []byte(`{"images":[],"finish_reasons":[null]}`), []byte("bad json")} {
		f := &fakeImage{body: raw}
		p := &ImageProvider{Client: f, Region: ImageRegion, Approved: true}
		image, err := p.Generate(context.Background(), "brief")
		if bytes.Equal(raw, good) {
			if err != nil || !bytes.Equal(image, body) {
				t.Fatal("valid PNG rejected")
			}
		} else if err == nil {
			t.Fatal("invalid/filtered image accepted")
		}
	}
}
func TestPrivatePNGStorageAndDestinationValidation(t *testing.T) {
	f := &fakeS3{}
	a := &Assets{Bucket: "private", Client: f}
	body := pngFixture(t)
	owner := "11111111-1111-4111-8111-111111111111"
	id := "0000000000-22222222-2222-4222-8222-222222222222"
	if err := a.PutImage(context.Background(), owner, id, 1, body); err != nil {
		t.Fatal(err)
	}
	in := f.calls[0]
	got, _ := io.ReadAll(in.Body)
	if !bytes.Equal(got, body) || aws.ToString(in.Key) != "owners/"+owner+"/jobs/"+id+"/1/illustration.png" || aws.ToString(in.ContentType) != "image/png" || in.ACL != "" || in.ServerSideEncryption != "AES256" || aws.ToString(in.CacheControl) != "private, no-store" {
		t.Fatal("private image contract lost")
	}
	if a.PutImage(context.Background(), "../escape", id, 0, body) == nil || a.PutImage(context.Background(), owner, id, 0, []byte("bad")) == nil || len(f.calls) != 1 {
		t.Fatal("invalid image reached S3")
	}
}
func TestImageSettingsRequireExplicitRegionAndParentActivation(t *testing.T) {
	env := map[string]string{"TECHCANVAS_GO_WORKER_ENABLED": "true", "CLOUD_BACKEND_READY": "true", "BEDROCK_USAGE_APPROVED": "true", "OWNER_SUBJECT": "11111111-1111-4111-8111-111111111111", "TABLE_NAME": "table", "ASSETS_BUCKET": "bucket", "BEDROCK_IMAGE_USAGE_APPROVED": "true"}
	get := func(k string) string { return env[k] }
	if _, err := SettingsFrom(get); err == nil {
		t.Fatal("missing approved image region accepted")
	}
	env["BEDROCK_IMAGE_REGION"] = ImageRegion
	s, err := SettingsFrom(get)
	if err != nil || !s.ImageEnabled {
		t.Fatal("valid explicit image configuration rejected")
	}
	env["BEDROCK_USAGE_APPROVED"] = "false"
	s, err = SettingsFrom(get)
	if err != nil || s.Enabled || s.ImageEnabled {
		t.Fatal("parent gate bypassed")
	}
}
