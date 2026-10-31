package engine

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"regexp"
)

var safeFailureCode = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_]{0,63}$`)

// Persist and log stage/code only. Provider messages can contain request data or secrets.
func generationFailure(m Message, stage string, err error, stop string) Item {
	code := "operation_failed"
	var api interface{ ErrorCode() string }
	var syntax *json.SyntaxError
	var fieldType *json.UnmarshalTypeError
	switch {
	case errors.As(err, &api) && safeFailureCode.MatchString(api.ErrorCode()):
		code = api.ErrorCode()
	case errors.Is(err, context.DeadlineExceeded):
		code = "deadline_exceeded"
	case errors.As(err, &syntax):
		code = "invalid_json"
	case errors.As(err, &fieldType):
		code = "invalid_content_type"
	case stage == "text_validation":
		code = "invalid_content"
	}
	messages := map[string]string{
		"text_generation": "The text provider request failed.",
		"text_validation": "The text response did not match the required content format.",
		"asset_render":    "The text could not be converted into draft assets.",
		"asset_storage":   "The draft assets could not be saved.",
	}
	message := messages[stage]
	if message == "" {
		message = "Generation failed."
	}
	result := Item{"error": message + " No AI image was requested. The reserved text attempt remains counted. You may explicitly retry once.", "failureStage": stage, "failureCode": code}
	if stage == "text_validation" && safeFailureCode.MatchString(stop) {
		result["textStopReason"] = stop
	}
	event := Item{"event": "generation_failed", "jobId": m.ID, "revision": m.Revision, "stage": stage, "code": code}
	if value, ok := result["textStopReason"]; ok {
		event["stopReason"] = value
	}
	raw, _ := json.Marshal(event)
	log.Print(string(raw))
	return result
}
