package gemini

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
)

type transport func(*http.Request) (*http.Response, error)

func (f transport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

const key = "unused-gemini-test-credential"

func fixture(t *testing.T, format string) []byte {
	t.Helper()
	var b bytes.Buffer
	im := image.NewRGBA(image.Rect(0, 0, 1264, 848))
	var err error
	if format == "image/jpeg" {
		err = jpeg.Encode(&b, im, nil)
	} else {
		err = png.Encode(&b, im)
	}
	if err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}
func envelope(t *testing.T, mime string, body []byte) []byte {
	t.Helper()
	raw, err := json.Marshal(map[string]any{"candidates": []any{map[string]any{"finishReason": "STOP", "content": map[string]any{"parts": []any{map[string]any{"inlineData": map[string]string{"mimeType": mime, "data": base64.StdEncoding.EncodeToString(body)}}}}}}})
	if err != nil {
		t.Fatal(err)
	}
	return raw
}
func response(status int, body []byte) *http.Response {
	return &http.Response{StatusCode: status, Header: make(http.Header), Body: io.NopCloser(bytes.NewReader(body))}
}
func TestPNGAndJPEGThroughFixedBoundedRequest(t *testing.T) {
	for _, mime := range []string{"image/png", "image/jpeg"} {
		t.Run(mime, func(t *testing.T) {
			calls := 0
			p := &Provider{Approved: true, APIKey: key, Client: &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
				calls++
				if r.URL.String() != Endpoint || r.Method != "POST" || r.Header.Get("x-goog-api-key") != key || r.URL.RawQuery != "" {
					t.Fatal("wrong destination or credential transport")
				}
				var request map[string]any
				if json.NewDecoder(r.Body).Decode(&request) != nil {
					t.Fatal("invalid request")
				}
				cfg := request["generationConfig"].(map[string]any)
				ic := cfg["imageConfig"].(map[string]any)
				thinking := cfg["thinkingConfig"].(map[string]any)
				if len(request) != 2 || len(cfg) != 5 || cfg["candidateCount"] != float64(1) || cfg["maxOutputTokens"] != float64(4096) || ic["imageSize"] != "1K" || ic["aspectRatio"] != "3:2" || thinking["thinkingLevel"] != "MINIMAL" {
					t.Fatal("unbounded settings or tools enabled")
				}
				return response(200, envelope(t, mime, fixture(t, mime))), nil
			})}}
			out, err := p.Generate(context.Background(), "a diagram")
			if err != nil || calls != 1 || engine.ValidatePNG(out) != nil {
				t.Fatal("valid image rejected", err)
			}
		})
	}
}
func TestGatesPreventNetwork(t *testing.T) {
	calls := 0
	p := &Provider{APIKey: key, Client: &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) { calls++; return nil, errors.New("unexpected") })}}
	if _, err := p.Generate(context.Background(), "brief"); err == nil {
		t.Fatal("approval bypass")
	}
	p.Approved = true
	for _, bad := range []string{"", key + "\n", strings.Repeat("x", 513)} {
		p.APIKey = bad
		if _, err := p.Generate(context.Background(), "brief"); err == nil {
			t.Fatal("key accepted")
		}
	}
	p.APIKey = key
	for _, bad := range []string{"", strings.Repeat("x", PromptLimit+1), "bad\x00", string([]byte{255})} {
		if _, err := p.Generate(context.Background(), bad); err == nil {
			t.Fatal("brief accepted")
		}
	}
	if calls != 0 {
		t.Fatal("invalid request sent")
	}
}
func TestNoRetryRedirectOrSecretLeak(t *testing.T) {
	for _, status := range []int{307, 400, 401, 403, 429, 500, 0} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			calls := 0
			p := &Provider{APIKey: key, Approved: true, Client: &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) {
				calls++
				if status == 0 {
					return nil, errors.New(key)
				}
				r := response(status, []byte(key))
				r.Header.Set("Location", "https://other.invalid")
				return r, nil
			})}}
			_, err := p.Generate(context.Background(), "brief")
			if err == nil || strings.Contains(err.Error(), key) || calls != 1 {
				t.Fatal("retry, redirect or credential leak")
			}
		})
	}
}
func TestRejectBlockedMalformedOrUnboundedImages(t *testing.T) {
	good := envelope(t, "image/png", fixture(t, "image/png"))
	var multiple map[string]any
	_ = json.Unmarshal(good, &multiple)
	candidate := multiple["candidates"].([]any)[0].(map[string]any)
	parts := candidate["content"].(map[string]any)
	parts["parts"] = append(parts["parts"].([]any), parts["parts"].([]any)[0])
	multi, _ := json.Marshal(multiple)
	for _, raw := range [][]byte{[]byte("invalid"), []byte(`{"candidates":[]}`), bytes.Replace(good, []byte(`"STOP"`), []byte(`"SAFETY"`), 1), bytes.Replace(good, []byte(`"STOP"`), []byte(`"MAX_TOKENS"`), 1), envelope(t, "image/jpeg", []byte("corrupt")), envelope(t, "image/gif", fixture(t, "image/png")), multi, []byte(strings.Repeat("x", responseLimit+1))} {
		p := &Provider{APIKey: key, Approved: true, Client: &http.Client{Transport: transport(func(*http.Request) (*http.Response, error) { return response(200, raw), nil })}}
		if _, err := p.Generate(context.Background(), "brief"); err == nil {
			t.Fatal("invalid image accepted")
		}
	}
	var b bytes.Buffer
	_ = jpeg.Encode(&b, image.NewRGBA(image.Rect(0, 0, 1600, 640)), nil)
	if _, err := normalize(b.Bytes(), "image/jpeg"); err == nil {
		t.Fatal("oversized dimensions accepted")
	}
}
func TestBriefContainsValidatedNotesAndArrowRules(t *testing.T) {
	c, _ := engine.DemoContent("Cache Aside")
	p := &Provider{}
	brief, err := p.BuildBrief("Cache Aside", c)
	if err != nil || !strings.Contains(brief, c.Sentence) || !strings.Contains(brief, "APP to CACHE") || len(brief) > PromptLimit {
		t.Fatal("bad diagram brief", err)
	}
	if _, err = p.BuildBrief("bad\nsubject", c); err == nil {
		t.Fatal("invalid topic accepted")
	}
	c.Concepts = nil
	if _, err = p.BuildBrief("Cache Aside", c); err == nil {
		t.Fatal("invalid notes accepted")
	}
}

func TestPrivateReferenceAttachedAndFailuresPreventInference(t *testing.T) {
	reference := fixture(t, "image/jpeg")
	for _, mode := range []string{"valid", "unavailable", "corrupt", "wrong-format", "oversized"} {
		t.Run(mode, func(t *testing.T) {
			calls := 0
			p := &Provider{Approved: true, APIKey: key, Reference: func(context.Context) ([]byte, string, error) {
				switch mode {
				case "unavailable":
					return nil, "", errors.New("private location must not leak")
				case "corrupt":
					return []byte("bad"), "image/jpeg", nil
				case "wrong-format":
					return reference, "image/png", nil
				case "oversized":
					return make([]byte, engine.ImageByteLimit+1), "image/jpeg", nil
				}
				return reference, "image/jpeg", nil
			}, Client: &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
				calls++
				var request struct {
					Contents []struct {
						Parts []struct {
							Text       string `json:"text"`
							InlineData *struct {
								MIME string `json:"mimeType"`
								Data string `json:"data"`
							} `json:"inlineData"`
						} `json:"parts"`
					} `json:"contents"`
				}
				if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
					t.Fatal(err)
				}
				if len(request.Contents) != 1 || len(request.Contents[0].Parts) != 2 {
					t.Fatal("reference missing or unbounded")
				}
				parts := request.Contents[0].Parts
				if parts[0].Text != "current subject" || parts[1].InlineData == nil || parts[1].InlineData.MIME != "image/jpeg" {
					t.Fatal("text/reference roles lost")
				}
				decoded, err := base64.StdEncoding.DecodeString(parts[1].InlineData.Data)
				if err != nil || !bytes.Equal(decoded, reference) {
					t.Fatal("reference bytes changed")
				}
				return response(200, envelope(t, "image/png", fixture(t, "image/png"))), nil
			})}}
			_, err := p.Generate(context.Background(), "current subject")
			if mode == "valid" {
				if err != nil || calls != 1 {
					t.Fatal("valid reference rejected", err)
				}
			} else if err == nil || calls != 0 || strings.Contains(err.Error(), "private location") {
				t.Fatal("invalid reference reached provider or leaked storage error")
			}
		})
	}
}

func TestVisualRecipeUsesCurrentSubjectInsteadOfReferenceLabels(t *testing.T) {
	p := &Provider{}
	for _, topic := range []string{"Cache Aside", "Idempotency", "Message Queues"} {
		c, _ := engine.DemoContent(topic)
		brief, err := p.BuildBrief(topic, c)
		if err != nil || !strings.Contains(brief, StyleVersion) || !strings.Contains(brief, "dimensional component icons") || !strings.Contains(brief, "quoted subject data") {
			t.Fatal(topic, "missing visual recipe", err)
		}
		if topic != "Cache Aside" && (strings.Contains(brief, "CACHE HIT") || strings.Contains(brief, "APP to CACHE")) {
			t.Fatal("reference-topic instructions leaked into", topic)
		}
	}
}

func TestRefinementSendsOriginalAndReportsUsageWithoutRetry(t *testing.T) {
	calls := 0
	original := fixture(t, "image/png")
	var usage *engine.ImageUsage
	p := &Provider{Approved: true, APIKey: key, Client: &http.Client{Transport: transport(func(r *http.Request) (*http.Response, error) {
		calls++
		var request map[string]any
		_ = json.NewDecoder(r.Body).Decode(&request)
		parts := request["contents"].([]any)[0].(map[string]any)["parts"].([]any)
		if len(parts) != 2 || !strings.Contains(parts[0].(map[string]any)["text"].(string), "Fix arrow five") {
			t.Fatal("edit target or instructions missing")
		}
		blob := parts[1].(map[string]any)["inlineData"].(map[string]any)
		decoded, _ := base64.StdEncoding.DecodeString(blob["data"].(string))
		if !bytes.Equal(decoded, original) {
			t.Fatal("wrong original image")
		}
		var result map[string]any
		_ = json.Unmarshal(envelope(t, "image/png", original), &result)
		result["usageMetadata"] = map[string]any{"promptTokenCount": 1467, "totalTokenCount": 3669, "candidatesTokensDetails": []any{map[string]any{"modality": "IMAGE", "tokenCount": 1120}}}
		body, _ := json.Marshal(result)
		return response(200, body), nil
	})}}
	_, err := p.Refine(engine.WithImageUsage(context.Background(), func(u engine.ImageUsage) { usage = &u }), "brief", original, "Fix arrow five")
	if err != nil || calls != 1 || usage == nil || usage.EstimatedUSD < 0.0439 || usage.EstimatedUSD > 0.044 {
		t.Fatal("refinement or price estimate failed", err)
	}
}
