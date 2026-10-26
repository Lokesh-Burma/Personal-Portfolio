package awsio

import (
	"context"
	"errors"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	bt "github.com/aws/aws-sdk-go-v2/service/bedrockruntime/types"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	dt "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"strings"
	"testing"
)

type fakeDynamo struct {
	write *dynamodb.TransactWriteItemsInput
	get   *dynamodb.GetItemInput
	err   error
}

func (f *fakeDynamo) GetItem(_ context.Context, in *dynamodb.GetItemInput, _ ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error) {
	f.get = in
	return &dynamodb.GetItemOutput{}, nil
}
func (f *fakeDynamo) TransactWriteItems(_ context.Context, in *dynamodb.TransactWriteItemsInput, _ ...func(*dynamodb.Options)) (*dynamodb.TransactWriteItemsOutput, error) {
	f.write = in
	return &dynamodb.TransactWriteItemsOutput{}, f.err
}

type fakeS3 struct{ calls []*s3.PutObjectInput }

func (f *fakeS3) PutObject(_ context.Context, in *s3.PutObjectInput, _ ...func(*s3.Options)) (*s3.PutObjectOutput, error) {
	f.calls = append(f.calls, in)
	return &s3.PutObjectOutput{}, nil
}

type fakeModel struct {
	input *bedrockruntime.ConverseInput
	calls int
	err   error
}

func (f *fakeModel) Converse(_ context.Context, in *bedrockruntime.ConverseInput, _ ...func(*bedrockruntime.Options)) (*bedrockruntime.ConverseOutput, error) {
	f.calls++
	f.input = in
	return &bedrockruntime.ConverseOutput{StopReason: bt.StopReasonEndTurn, Output: &bt.ConverseOutputMemberMessage{Value: bt.Message{Content: []bt.ContentBlock{&bt.ContentBlockMemberText{Value: "{}"}}}}}, f.err
}
func TestConditionalDynamoProtocolAndConflictClassification(t *testing.T) {
	client := &fakeDynamo{}
	r := &Repository{Table: "Table", Client: client}
	_, _ = r.Get(context.Background(), "OWNER#owner", "JOB#id")
	if !aws.ToBool(client.get.ConsistentRead) {
		t.Fatal("strong read required")
	}
	err := r.Commit(context.Background(), []engine.Change{{PK: "OWNER#owner", SK: "JOB#id", Before: engine.Item{"rev": 3}, Value: engine.Item{"status": "running"}}, {PK: "QUOTA#GLOBAL", SK: "DAY#date", Value: engine.Item{"count": 1}}})
	if err != nil {
		t.Fatal(err)
	}
	if len(client.write.TransactItems) != 2 || aws.ToString(client.write.TransactItems[0].Put.ConditionExpression) != "#revision = :previous" || aws.ToString(client.write.TransactItems[1].Put.ConditionExpression) != "attribute_not_exists(pk)" {
		t.Fatal("atomic conditional contract changed")
	}
	var item map[string]any
	_ = attributevalue.UnmarshalMap(client.write.TransactItems[0].Put.Item, &item)
	if item["rev"] != float64(4) {
		t.Fatal("revision must advance")
	}
	client.err = &dt.TransactionCanceledException{CancellationReasons: []dt.CancellationReason{{Code: aws.String("ConditionalCheckFailed")}}}
	if !errors.Is(r.Commit(context.Background(), []engine.Change{}), engine.ErrConflict) {
		t.Fatal("lost conditional conflict")
	}
	client.err = errors.New("network outcome unknown")
	if errors.Is(r.Commit(context.Background(), []engine.Change{}), engine.ErrConflict) {
		t.Fatal("uncertain outcomes cannot be blindly retried")
	}
}
func TestPrivateAssetKeysAndNoPublicACL(t *testing.T) {
	client := &fakeS3{}
	a := &Assets{Bucket: "private", Client: client}
	c, _ := engine.DemoContent("Cache Aside")
	files, _ := engine.Render("Cache Aside", c, true)
	owner := "11111111-1111-4111-8111-111111111111"
	id := "0000000000-22222222-2222-4222-8222-222222222222"
	if err := a.Put(context.Background(), owner, id, 0, files); err != nil {
		t.Fatal(err)
	}
	if len(client.calls) != 8 {
		t.Fatal("missing assets")
	}
	for _, in := range client.calls {
		if !strings.HasPrefix(aws.ToString(in.Key), "owners/"+owner+"/jobs/"+id+"/0/") || in.ACL != "" || in.ServerSideEncryption != "AES256" || aws.ToString(in.CacheControl) != "private, no-store" {
			t.Fatal("private storage contract changed")
		}
	}
	before := len(client.calls)
	if err := a.Put(context.Background(), "../escape", id, 0, files); err == nil || len(client.calls) != before {
		t.Fatal("invalid owner reached storage")
	}
}
func TestConverseBoundsAndNoProviderRetry(t *testing.T) {
	client := &fakeModel{err: errors.New("timeout")}
	p := &Provider{Client: client}
	prompt, _, err := engine.BuildPrompt("Cache Aside")
	if err != nil {
		t.Fatal(err)
	}
	_, _, _ = p.Invoke(context.Background(), prompt)
	if client.calls != 1 || aws.ToString(client.input.ModelId) != engine.Model || aws.ToInt32(client.input.InferenceConfig.MaxTokens) != 1600 {
		t.Fatal("model bounds changed")
	}
	_, _, err = p.Invoke(context.Background(), engine.Prompt{System: []engine.TextBlock{{Text: strings.Repeat("x", 6001)}}})
	if err == nil || client.calls != 1 {
		t.Fatal("oversized prompt reached SDK")
	}
}
func TestExplicitActivationAndRegionGates(t *testing.T) {
	env := map[string]string{"CLOUD_BACKEND_READY": "true", "BEDROCK_USAGE_APPROVED": "true"}
	get := func(k string) string { return env[k] }
	s, err := SettingsFrom(get)
	if err != nil || s.Enabled {
		t.Fatal("Go worker must be separately opt-in")
	}
	env["TECHCANVAS_GO_WORKER_ENABLED"] = "true"
	if _, err = SettingsFrom(get); err == nil {
		t.Fatal("missing owner/storage must reject activation")
	}
	env["AWS_REGION"] = "us-east-1"
	if _, err = SettingsFrom(get); err == nil {
		t.Fatal("unsupported region accepted")
	}
}
