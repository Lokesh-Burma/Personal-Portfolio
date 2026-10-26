package awsio

import (
	"context"
	"errors"
	"fmt"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	brtypes "github.com/aws/aws-sdk-go-v2/service/bedrockruntime/types"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	ddbtypes "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"strings"
	"time"
)

const Region = "ap-southeast-2"

func Configuration(ctx context.Context) (aws.Config, error) {
	return config.LoadDefaultConfig(ctx, config.WithRegion(Region), config.WithRetryer(func() aws.Retryer { return aws.NopRetryer{} }))
}

type Dynamo interface {
	GetItem(context.Context, *dynamodb.GetItemInput, ...func(*dynamodb.Options)) (*dynamodb.GetItemOutput, error)
	TransactWriteItems(context.Context, *dynamodb.TransactWriteItemsInput, ...func(*dynamodb.Options)) (*dynamodb.TransactWriteItemsOutput, error)
}
type Repository struct {
	Table  string
	Client Dynamo
}

func (r *Repository) Get(ctx context.Context, pk, sk string) (engine.Item, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	out, err := r.Client.GetItem(ctx, &dynamodb.GetItemInput{TableName: aws.String(r.Table), Key: map[string]ddbtypes.AttributeValue{"pk": &ddbtypes.AttributeValueMemberS{Value: pk}, "sk": &ddbtypes.AttributeValueMemberS{Value: sk}}, ConsistentRead: aws.Bool(true)})
	if err != nil {
		return nil, err
	}
	if len(out.Item) == 0 {
		return nil, nil
	}
	var item engine.Item
	err = attributevalue.UnmarshalMap(out.Item, &item)
	return item, err
}
func (r *Repository) Commit(ctx context.Context, changes []engine.Change) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	transactions := make([]ddbtypes.TransactWriteItem, 0, len(changes))
	for _, c := range changes {
		value := engine.Item{}
		for k, v := range c.Value {
			value[k] = v
		}
		var rev int64 = 1
		if c.Before != nil {
			raw, err := attributevalue.Marshal(c.Before["rev"])
			if err != nil {
				return err
			}
			n, ok := raw.(*ddbtypes.AttributeValueMemberN)
			if !ok {
				return errors.New("missing revision")
			}
			if _, err = fmt.Sscan(n.Value, &rev); err != nil {
				return err
			}
			rev++
		}
		value["pk"] = c.PK
		value["sk"] = c.SK
		value["rev"] = rev
		item, err := attributevalue.MarshalMap(value)
		if err != nil {
			return err
		}
		put := &ddbtypes.Put{TableName: aws.String(r.Table), Item: item, ConditionExpression: aws.String("attribute_not_exists(pk)")}
		if c.Before != nil {
			previous, err := attributevalue.Marshal(c.Before["rev"])
			if err != nil {
				return err
			}
			put.ConditionExpression = aws.String("#revision = :previous")
			put.ExpressionAttributeNames = map[string]string{"#revision": "rev"}
			put.ExpressionAttributeValues = map[string]ddbtypes.AttributeValue{":previous": previous}
		}
		transactions = append(transactions, ddbtypes.TransactWriteItem{Put: put})
	}
	_, err := r.Client.TransactWriteItems(ctx, &dynamodb.TransactWriteItemsInput{TransactItems: transactions})
	var conflict *ddbtypes.TransactionCanceledException
	if errors.As(err, &conflict) {
		for _, reason := range conflict.CancellationReasons {
			if reason.Code != nil && (*reason.Code == "ConditionalCheckFailed" || *reason.Code == "TransactionConflict") {
				return engine.ErrConflict
			}
		}
	}
	return err
}

type ObjectStore interface {
	PutObject(context.Context, *s3.PutObjectInput, ...func(*s3.Options)) (*s3.PutObjectOutput, error)
}
type Assets struct {
	Bucket string
	Client ObjectStore
}

func (a *Assets) Put(ctx context.Context, owner, id string, revision int, files map[string]string) error {
	ctx, cancelBatch := context.WithTimeout(ctx, 5*time.Second)
	defer cancelBatch()
	if !engine.JobID.MatchString(id) || !ownerID.MatchString(owner) || revision < 0 || revision >= 2 || len(files) != len(engine.AssetNames) {
		return errors.New("invalid private asset destination")
	}
	for _, name := range engine.AssetNames {
		if _, ok := files[name]; !ok {
			return errors.New("missing asset")
		}
	}
	for _, name := range engine.AssetNames {
		mime := "text/plain; charset=utf-8"
		if strings.HasSuffix(name, ".svg") {
			mime = "image/svg+xml"
		}
		if strings.HasSuffix(name, ".json") {
			mime = "application/json"
		}
		op, cancel := context.WithTimeout(ctx, 5*time.Second)
		_, err := a.Client.PutObject(op, &s3.PutObjectInput{Bucket: aws.String(a.Bucket), Key: aws.String(fmt.Sprintf("owners/%s/jobs/%s/%d/%s", owner, id, revision, name)), Body: strings.NewReader(files[name]), ContentType: aws.String(mime), CacheControl: aws.String("private, no-store"), ServerSideEncryption: s3types.ServerSideEncryptionAes256})
		cancel()
		if err != nil {
			return err
		}
	}
	return nil
}

type ModelClient interface {
	Converse(context.Context, *bedrockruntime.ConverseInput, ...func(*bedrockruntime.Options)) (*bedrockruntime.ConverseOutput, error)
}
type Provider struct{ Client ModelClient }

func (p *Provider) Invoke(ctx context.Context, prompt engine.Prompt) (string, string, error) {
	// Re-check the exact bounded prompt before touching the SDK; clients use NopRetryer.
	if err := engine.CheckPrompt(prompt); err != nil {
		return "", "", err
	}
	input := &bedrockruntime.ConverseInput{ModelId: aws.String(engine.Model), InferenceConfig: &brtypes.InferenceConfiguration{MaxTokens: aws.Int32(engine.OutputLimit), Temperature: aws.Float32(0)}}
	for _, s := range prompt.System {
		input.System = append(input.System, &brtypes.SystemContentBlockMemberText{Value: s.Text})
	}
	for _, m := range prompt.Messages {
		message := brtypes.Message{Role: brtypes.ConversationRole(m.Role)}
		for _, c := range m.Content {
			message.Content = append(message.Content, &brtypes.ContentBlockMemberText{Value: c.Text})
		}
		input.Messages = append(input.Messages, message)
	}
	op, cancel := context.WithTimeout(ctx, 80*time.Second)
	defer cancel()
	out, err := p.Client.Converse(op, input)
	if err != nil {
		return "", "", err
	}
	message, ok := out.Output.(*brtypes.ConverseOutputMemberMessage)
	if !ok {
		return "", "", errors.New("missing model message")
	}
	text := ""
	for _, block := range message.Value.Content {
		if t, ok := block.(*brtypes.ContentBlockMemberText); ok {
			text += t.Value
			if len(text) > 24000 {
				return "", "", errors.New("oversized response")
			}
		}
	}
	return text, string(out.StopReason), nil
}
