package awsio

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"regexp"
	"strings"
	"time"

	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/gemini"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var styleReferenceKey = regexp.MustCompile(`^style-references/([a-f0-9]{64})\.(jpg|png)$`)

type ReferenceReader interface {
	GetObject(context.Context, *s3.GetObjectInput, ...func(*s3.Options)) (*s3.GetObjectOutput, error)
}

// StyleReference is deployment-controlled and hash-pinned, never a user URL.
type StyleReference struct {
	Bucket, Key string
	Client      ReferenceReader
}

func (r *StyleReference) Load(ctx context.Context) ([]byte, string, error) {
	match := styleReferenceKey.FindStringSubmatch(r.Key)
	if r.Bucket == "" || len(match) != 3 || r.Client == nil {
		return nil, "", errors.New("invalid style reference configuration")
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	out, err := r.Client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(r.Bucket), Key: aws.String(r.Key)})
	if err != nil || out == nil || out.Body == nil {
		return nil, "", errors.New("private style reference unavailable")
	}
	defer out.Body.Close()
	body, err := io.ReadAll(io.LimitReader(out.Body, engine.ImageByteLimit+1))
	if err != nil || len(body) > engine.ImageByteLimit {
		return nil, "", errors.New("invalid style reference size")
	}
	sum := sha256.Sum256(body)
	if hex.EncodeToString(sum[:]) != match[1] {
		return nil, "", errors.New("style reference checksum mismatch")
	}
	mime := "image/png"
	if strings.HasSuffix(r.Key, ".jpg") {
		mime = "image/jpeg"
	}
	if err = gemini.ValidateReference(body, mime); err != nil {
		return nil, "", err
	}
	return body, mime, nil
}
