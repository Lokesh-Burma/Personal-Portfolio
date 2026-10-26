package engine

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/aws/aws-lambda-go/events"
	"io"
	"strings"
)

func Handler(w *Worker, owner string) func(context.Context, events.SQSEvent) (events.SQSEventResponse, error) {
	return func(ctx context.Context, event events.SQSEvent) (events.SQSEventResponse, error) {
		result := events.SQSEventResponse{BatchItemFailures: []events.SQSBatchItemFailure{}}
		if !w.Enabled || owner == "" || owner == "UNCONFIGURED" {
			return result, ErrDisabled
		}
		failed := false
		for _, r := range event.Records {
			// FIFO: after the first failure, return remaining records too so order is not lost.
			err := error(nil)
			if failed {
				err = errors.New("prior FIFO record failed")
			} else {
				var wire struct {
					Owner    string `json:"owner"`
					ID       string `json:"id"`
					Revision *int   `json:"revision"`
				}
				d := json.NewDecoder(strings.NewReader(r.Body))
				d.DisallowUnknownFields()
				if len(r.Body) > 4096 {
					err = errors.New("oversized message")
				} else {
					err = d.Decode(&wire)
				}
				if err == nil && d.Decode(new(any)) != io.EOF {
					err = errors.New("trailing message data")
				}
				if err == nil && (wire.Owner != owner || r.Attributes["MessageGroupId"] != "owner" || wire.Revision == nil) {
					err = errors.New("invalid owner or FIFO group")
				}
				if err == nil {
					err = w.Work(ctx, Message{wire.Owner, wire.ID, *wire.Revision})
				}
			}
			if err != nil {
				failed = true
				result.BatchItemFailures = append(result.BatchItemFailures, events.SQSBatchItemFailure{ItemIdentifier: r.MessageId})
			}
		}
		return result, nil
	}
}
