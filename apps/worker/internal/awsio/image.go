package awsio

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// Candidate adapter only: this region/model needs explicit approval before use.
const ImageRegion = "us-west-2"
const ImageModel = "stability.stable-image-core-v1:1"

type ImageModelClient interface {
	InvokeModel(context.Context, *bedrockruntime.InvokeModelInput, ...func(*bedrockruntime.Options)) (*bedrockruntime.InvokeModelOutput, error)
}
type ImageProvider struct {
	Client   ImageModelClient
	Approved bool
	Region   string
}

func (p *ImageProvider) Generate(ctx context.Context, brief string) ([]byte, error) {
	if !p.Approved || p.Region != ImageRegion || p.Client == nil {
		return nil, errors.New("image inference disabled")
	}
	if !utf8.ValidString(brief) || len(brief) == 0 || len(brief) > 2400 || strings.ContainsRune(brief, 0) {
		return nil, errors.New("invalid image brief")
	}
	body, err := json.Marshal(map[string]any{"prompt": brief, "aspect_ratio": "1:1", "output_format": "png"})
	if err != nil {
		return nil, err
	}
	op, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	out, err := p.Client.InvokeModel(op, &bedrockruntime.InvokeModelInput{ModelId: aws.String(ImageModel), ContentType: aws.String("application/json"), Accept: aws.String("application/json"), Body: body})
	if err != nil {
		return nil, err
	}
	if out == nil || len(out.Body) > 8*1024*1024 {
		return nil, errors.New("image response size limit")
	}
	var result struct {
		Images  []string          `json:"images"`
		Reasons []json.RawMessage `json:"finish_reasons"`
	}
	if err = json.Unmarshal(out.Body, &result); err != nil {
		return nil, errors.New("invalid image response")
	}
	if len(result.Images) != 1 || len(result.Reasons) != 1 || string(bytes.TrimSpace(result.Reasons[0])) != "null" {
		return nil, errors.New("image generation filtered or incomplete")
	}
	image, err := base64.StdEncoding.Strict().DecodeString(result.Images[0])
	if err != nil {
		return nil, errors.New("invalid image encoding")
	}
	if err = engine.ValidatePNG(image); err != nil {
		return nil, err
	}
	return image, nil
}
func (a *Assets) PutImage(ctx context.Context, owner, id string, revision int, body []byte) error {
	if !engine.JobID.MatchString(id) || !ownerID.MatchString(owner) || revision < 0 || revision >= 2 {
		return errors.New("invalid private image destination")
	}
	if err := engine.ValidatePNG(body); err != nil {
		return err
	}
	op, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	_, err := a.Client.PutObject(op, &s3.PutObjectInput{Bucket: aws.String(a.Bucket), Key: aws.String("owners/" + owner + "/jobs/" + id + "/" + strconv.Itoa(revision) + "/illustration.png"), Body: bytes.NewReader(body), ContentType: aws.String("image/png"), CacheControl: aws.String("private, no-store"), ServerSideEncryption: s3types.ServerSideEncryptionAes256})
	return err
}
