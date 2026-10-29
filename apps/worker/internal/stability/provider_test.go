package stability

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/png"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"strings"
	"testing"

	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
)

type transportFunc func(*http.Request) (*http.Response, error)

func (f transportFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

const testKey = "sk-unused-test-key-not-a-credential"

func fixture(t *testing.T) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := png.Encode(&b, image.NewNRGBA(image.Rect(0, 0, 640, 640))); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}
func response(status int, body []byte) *http.Response {
	return &http.Response{StatusCode: status, Header: http.Header{"Content-Type": []string{"image/png"}, "Finish-Reason": []string{"SUCCESS"}}, Body: io.NopCloser(bytes.NewReader(body))}
}
func TestApprovedFixedMultipartRequestReturnsValidatedPNG(t *testing.T) {
	body := fixture(t)
	calls := 0
	p := &Provider{Approved: true, APIKey: testKey, Client: &http.Client{Transport: transportFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.URL.String() != Endpoint || r.Method != "POST" || r.Header.Get("Authorization") != "Bearer "+testKey || r.Header.Get("Accept") != "image/*" || r.Header.Get("Idempotency-Key") != "" {
			t.Fatal("unexpected endpoint, authentication or retry behavior")
		}
		_, params, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
		form, err := multipart.NewReader(r.Body, params["boundary"]).ReadForm(4096)
		if err != nil {
			t.Fatal(err)
		}
		defer form.RemoveAll()
		if len(form.Value) != 3 || len(form.File) != 0 || form.Value["prompt"][0] != "explain caching visually" || form.Value["output_format"][0] != "png" || form.Value["aspect_ratio"][0] != "1:1" {
			t.Fatal("unexpected image generation parameters")
		}
		return response(200, body), nil
	})}}
	got, err := p.Generate(context.Background(), "explain caching visually")
	if err != nil || !bytes.Equal(got, body) || calls != 1 {
		t.Fatal("valid image rejected or repeated")
	}
}
func TestGatesAndInputBoundsPreventRequests(t *testing.T) {
	calls := 0
	p := &Provider{APIKey: testKey, Client: &http.Client{Transport: transportFunc(func(*http.Request) (*http.Response, error) { calls++; return nil, errors.New("must not send") })}}
	if _, err := p.Generate(context.Background(), "brief"); err == nil {
		t.Fatal("approval bypassed")
	}
	p.Approved = true
	for _, key := range []string{"", testKey + "\n", strings.Repeat("x", 513)} {
		p.APIKey = key
		if _, err := p.Generate(context.Background(), "brief"); err == nil {
			t.Fatal("invalid key accepted")
		}
	}
	p.APIKey = testKey
	for _, brief := range []string{"", strings.Repeat("x", 2401), "bad\x00brief", string([]byte{0xff})} {
		if _, err := p.Generate(context.Background(), brief); err == nil {
			t.Fatal("invalid brief accepted")
		}
	}
	if calls != 0 {
		t.Fatal("invalid request reached network")
	}
}
func TestRedirectNeverForwardsKey(t *testing.T) {
	calls := 0
	p := &Provider{Approved: true, APIKey: testKey, Client: &http.Client{Transport: transportFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.URL.String() != Endpoint {
			t.Fatal("key forwarded to redirect destination")
		}
		out := response(307, nil)
		out.Header.Set("Location", "https://other.invalid/collect")
		return out, nil
	})}}
	if _, err := p.Generate(context.Background(), "brief"); err == nil || calls != 1 {
		t.Fatal("redirect followed")
	}
}
func TestProviderErrorsNeverRetryOrExposeKey(t *testing.T) {
	for _, status := range []int{401, 402, 403, 429, 500} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			calls := 0
			p := &Provider{Approved: true, APIKey: testKey, Client: &http.Client{Transport: transportFunc(func(*http.Request) (*http.Response, error) { calls++; return response(status, []byte(testKey)), nil })}}
			_, err := p.Generate(context.Background(), "brief")
			if err == nil || calls != 1 || strings.Contains(err.Error(), testKey) {
				t.Fatal("error retried or leaked key")
			}
		})
	}
	calls := 0
	p := &Provider{Approved: true, APIKey: testKey, Client: &http.Client{Transport: transportFunc(func(*http.Request) (*http.Response, error) { calls++; return nil, errors.New(testKey) })}}
	_, err := p.Generate(context.Background(), "brief")
	if err == nil || calls != 1 || strings.Contains(err.Error(), testKey) {
		t.Fatal("transport error leaked key or retried")
	}
}
func TestRejectsFilteredCorruptOversizedAndNonPNGResponses(t *testing.T) {
	for _, kind := range []string{"filtered", "missing-finish", "html", "corrupt", "oversized"} {
		t.Run(kind, func(t *testing.T) {
			out := response(200, fixture(t))
			switch kind {
			case "filtered":
				out.Header.Set("finish-reason", "CONTENT_FILTERED")
			case "missing-finish":
				out.Header.Del("finish-reason")
			case "html":
				out.Header.Set("Content-Type", "text/html")
			case "corrupt":
				out.Body = io.NopCloser(strings.NewReader("not PNG"))
			case "oversized":
				out.Body = io.NopCloser(io.LimitReader(zeroReader{}, engine.ImageByteLimit+1))
			}
			p := &Provider{Approved: true, APIKey: testKey, Client: &http.Client{Transport: transportFunc(func(*http.Request) (*http.Response, error) { return out, nil })}}
			if _, err := p.Generate(context.Background(), "brief"); err == nil {
				t.Fatal("invalid image accepted")
			}
		})
	}
}

type zeroReader struct{}

func (zeroReader) Read(p []byte) (int, error) { clear(p); return len(p), nil }
