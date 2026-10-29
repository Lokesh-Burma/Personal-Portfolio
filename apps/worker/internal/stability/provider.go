// Package stability implements the direct Stable Image Core API without Bedrock.
package stability

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
)

const Endpoint = "https://api.stability.ai/v2beta/stable-image/generate/core"
const CreditCost = 3

type Provider struct {
	APIKey   string
	Approved bool
	Client   *http.Client
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
	if !p.Approved {
		return nil, errors.New("direct Stability inference disabled")
	}
	if !ValidKey(p.APIKey) {
		return nil, errors.New("Stability API key is missing or invalid")
	}
	if !utf8.ValidString(brief) || len(brief) == 0 || len(brief) > 2400 || strings.ContainsRune(brief, 0) {
		return nil, errors.New("invalid image brief")
	}
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	for _, field := range [][2]string{{"prompt", brief}, {"aspect_ratio", "1:1"}, {"output_format", "png"}} {
		if err := form.WriteField(field[0], field[1]); err != nil {
			return nil, errors.New("image request encoding failed")
		}
	}
	if err := form.Close(); err != nil {
		return nil, errors.New("image request encoding failed")
	}
	op, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(op, http.MethodPost, Endpoint, &body)
	if err != nil {
		return nil, errors.New("invalid image request")
	}
	req.Header.Set("Authorization", "Bearer "+p.APIKey)
	req.Header.Set("Accept", "image/*")
	req.Header.Set("Content-Type", form.FormDataContentType())
	client := http.Client{Timeout: 45 * time.Second}
	if p.Client != nil {
		client = *p.Client
		if client.Timeout == 0 || client.Timeout > 45*time.Second {
			client.Timeout = 45 * time.Second
		}
	}
	// Never forward the key through redirects, and never automatically repeat a POST.
	client.CheckRedirect = func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }
	response, err := client.Do(req)
	if err != nil {
		return nil, errors.New("Stability request failed; its outcome is unknown and must not be automatically retried")
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		switch response.StatusCode {
		case 401:
			return nil, errors.New("Stability rejected the API key")
		case 402:
			return nil, errors.New("Stability credits are insufficient; no credits were purchased")
		case 403:
			return nil, errors.New("Stability blocked the request")
		case 429:
			return nil, errors.New("Stability rate limit reached; no automatic retry was made")
		default:
			return nil, fmt.Errorf("Stability returned HTTP %d; no automatic retry was made", response.StatusCode)
		}
	}
	media, _, err := mime.ParseMediaType(response.Header.Get("Content-Type"))
	if err != nil || media != "image/png" {
		return nil, errors.New("Stability did not return a PNG")
	}
	if response.Header.Get("finish-reason") != "SUCCESS" {
		return nil, errors.New("Stability image was filtered or incomplete")
	}
	image, err := io.ReadAll(io.LimitReader(response.Body, engine.ImageByteLimit+1))
	if err != nil {
		return nil, errors.New("Stability image download failed; no automatic retry was made")
	}
	if err = engine.ValidatePNG(image); err != nil {
		return nil, err
	}
	return image, nil
}
