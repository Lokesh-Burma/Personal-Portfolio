// Package gemini implements bounded Nano Banana image generation over HTTPS.
package gemini

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
)

const Model = "gemini-nano-banana-2.1"
const Endpoint = "https://generativelanguage.googleapis.com/v1/models/" + Model + ":generateContent"
const PromptLimit = 6000
const responseLimit = 8 * 1024 * 1024

type Provider struct {
	APIKey   string
	Approved bool
	Client   *http.Client
	// Reference loads an approved private style image, never a job-supplied URL.
	Reference func(context.Context) ([]byte, string, error)
}

func ValidKey(key string) bool {
	if len(key) < 16 || len(key) > 512 {
		return false
	}
	for _, r := range key {
		if r < 33 || r > 126 {
			return false
		}
	}
	return true
}

func (p *Provider) Generate(ctx context.Context, brief string) ([]byte, error) {
	return p.generate(ctx, brief, nil)
}
func (p *Provider) Refine(ctx context.Context, brief string, previous []byte, instructions string) ([]byte, error) {
	if err := engine.ValidatePNG(previous); err != nil {
		return nil, err
	}
	if !utf8.ValidString(instructions) || len(instructions) < 3 || len(instructions) > 600 || strings.ContainsAny(instructions, "\x00\r\n") {
		return nil, errors.New("invalid refinement instructions")
	}
	quoted, _ := json.Marshal(instructions)
	brief += "\nEDIT TARGET: the final attached image is the existing draft to edit. Keep its topic, unrequested text, composition and component relationships. The first optional image is a style guide only. Apply only this requested change, supplied as quoted owner instructions: " + string(quoted)
	return p.generate(ctx, brief, []any{map[string]any{"inlineData": map[string]string{"mimeType": "image/png", "data": base64.StdEncoding.EncodeToString(previous)}}})
}
func (p *Provider) generate(ctx context.Context, brief string, targets []any) ([]byte, error) {
	if !p.Approved {
		return nil, errors.New("Gemini image inference disabled")
	}
	if !ValidKey(p.APIKey) {
		return nil, errors.New("Gemini API key is missing or invalid")
	}
	if !utf8.ValidString(brief) || strings.TrimSpace(brief) == "" || len(brief) > PromptLimit || strings.ContainsRune(brief, 0) {
		return nil, errors.New("invalid image brief")
	}
	parts := []any{map[string]string{"text": brief}}
	if p.Reference != nil {
		reference, mime, err := p.Reference(ctx)
		if err != nil {
			return nil, errors.New("private style reference unavailable; no inference made")
		}
		if err = ValidateReference(reference, mime); err != nil {
			return nil, err
		}
		parts = append(parts, map[string]any{"inlineData": map[string]string{"mimeType": mime, "data": base64.StdEncoding.EncodeToString(reference)}})
	}
	parts = append(parts, targets...)
	payload := map[string]any{
		"contents":         []any{map[string]any{"role": "user", "parts": parts}},
		"generationConfig": map[string]any{"candidateCount": 1, "responseModalities": []string{"IMAGE"}, "imageConfig": map[string]string{"aspectRatio": "3:2", "imageSize": "1K"}, "thinkingConfig": map[string]any{"thinkingLevel": "MINIMAL", "includeThoughts": false}, "maxOutputTokens": 4096},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, errors.New("image request encoding failed")
	}
	op, cancel := context.WithTimeout(ctx, 90*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(op, http.MethodPost, Endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, errors.New("invalid image request")
	}
	req.Header.Set("x-goog-api-key", p.APIKey)
	req.Header.Set("Content-Type", "application/json")
	client := http.Client{Timeout: 90 * time.Second}
	if p.Client != nil {
		client = *p.Client
		if client.Timeout == 0 || client.Timeout > 90*time.Second {
			client.Timeout = 90 * time.Second
		}
	}
	// Never forward credentials through redirects or retry a paid POST.
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	res, err := client.Do(req)
	if err != nil {
		return nil, errors.New("Gemini request failed; outcome unknown, no automatic retry")
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Gemini returned HTTP %d; check access, balance or quota; no automatic retry", res.StatusCode)
	}
	raw, err := io.ReadAll(io.LimitReader(res.Body, responseLimit+1))
	if err != nil || len(raw) > responseLimit {
		return nil, errors.New("Gemini response unreadable or oversized; no automatic retry")
	}
	var result struct {
		Usage struct {
			Prompt     int64 `json:"promptTokenCount"`
			Total      int64 `json:"totalTokenCount"`
			Candidates int64 `json:"candidatesTokenCount"`
			Details    []struct {
				Modality string `json:"modality"`
				Tokens   int64  `json:"tokenCount"`
			} `json:"candidatesTokensDetails"`
		} `json:"usageMetadata"`
		PromptFeedback struct {
			BlockReason string `json:"blockReason"`
		} `json:"promptFeedback"`
		Candidates []struct {
			FinishReason string `json:"finishReason"`
			Content      struct {
				Parts []struct {
					Thought    bool `json:"thought"`
					InlineData *struct {
						MIME string `json:"mimeType"`
						Data string `json:"data"`
					} `json:"inlineData"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if json.Unmarshal(raw, &result) != nil {
		return nil, errors.New("invalid Gemini response")
	}
	imageTokens := int64(0)
	for _, detail := range result.Usage.Details {
		if detail.Modality == "IMAGE" {
			imageTokens += detail.Tokens
		}
	}
	other := result.Usage.Total - result.Usage.Prompt - imageTokens
	if result.Usage.Prompt >= 0 && other >= 0 && imageTokens > 0 && result.Usage.Total <= 20000 {
		engine.ReportImageUsage(ctx, engine.ImageUsage{Model: Model, PromptTokens: result.Usage.Prompt, OutputTokens: result.Usage.Total - result.Usage.Prompt, ImageTokens: imageTokens, EstimatedUSD: (float64(result.Usage.Prompt)*1.5 + float64(imageTokens)*30 + float64(other)*7.5) / 1e6, PricingAsOf: "2026-10-30"})
	}
	if result.PromptFeedback.BlockReason != "" || len(result.Candidates) != 1 || result.Candidates[0].FinishReason != "STOP" {
		return nil, errors.New("Gemini image blocked or incomplete")
	}
	var output []byte
	for _, part := range result.Candidates[0].Content.Parts {
		if part.Thought || part.InlineData == nil {
			continue
		}
		if output != nil {
			return nil, errors.New("Gemini returned multiple images")
		}
		blob := part.InlineData
		if len(blob.Data) > base64.StdEncoding.EncodedLen(engine.ImageByteLimit) {
			return nil, errors.New("image size limit")
		}
		decoded, err := base64.StdEncoding.Strict().DecodeString(blob.Data)
		if err != nil {
			return nil, errors.New("invalid image encoding")
		}
		output, err = normalize(decoded, blob.MIME)
		if err != nil {
			return nil, err
		}
	}
	if output == nil {
		return nil, errors.New("Gemini returned no final image")
	}
	return output, nil
}

// Keep the existing private illustration.png contract for either provider format.
func normalize(body []byte, mime string) ([]byte, error) {
	if mime == "image/png" {
		if err := engine.ValidatePNG(body); err != nil {
			return nil, err
		}
		return body, nil
	}
	if mime != "image/jpeg" || len(body) == 0 || len(body) > engine.ImageByteLimit {
		return nil, errors.New("unsupported image format or size")
	}
	cfg, err := jpeg.DecodeConfig(bytes.NewReader(body))
	if err != nil || cfg.Width < 640 || cfg.Height < 640 || cfg.Width > 1536 || cfg.Height > 1536 {
		return nil, errors.New("invalid JPEG dimensions")
	}
	im, err := jpeg.Decode(bytes.NewReader(body))
	if err != nil {
		return nil, errors.New("corrupt JPEG")
	}
	var out bytes.Buffer
	if err = png.Encode(&out, im); err != nil {
		return nil, errors.New("PNG encoding failed")
	}
	if err = engine.ValidatePNG(out.Bytes()); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

var _ engine.ImageProvider = (*Provider)(nil)

// ValidateReference rejects corrupt, oversized or mismatched input before paid inference.
func ValidateReference(body []byte, mime string) error {
	_, err := normalize(body, mime)
	return err
}
