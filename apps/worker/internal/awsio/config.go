package awsio

import (
	"errors"
	"os"
	"regexp"
)

var ownerID = regexp.MustCompile(`^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$`)

type Settings struct {
	Enabled              bool
	ImageEnabled         bool
	Owner, Table, Bucket string
}

func SettingsFrom(get func(string) string) (Settings, error) {
	s := Settings{Enabled: get("TECHCANVAS_GO_WORKER_ENABLED") == "true" && get("CLOUD_BACKEND_READY") == "true" && get("BEDROCK_USAGE_APPROVED") == "true", Owner: get("OWNER_SUBJECT"), Table: get("TABLE_NAME"), Bucket: get("ASSETS_BUCKET")}
	if region := get("AWS_REGION"); region != "" && region != Region {
		return s, errors.New("unsupported AWS region")
	}
	if s.Enabled && (!ownerID.MatchString(s.Owner) || s.Table == "" || s.Bucket == "") {
		return s, errors.New("worker requires reviewed owner and storage configuration")
	}
	s.ImageEnabled = s.Enabled && get("BEDROCK_IMAGE_USAGE_APPROVED") == "true"
	if s.ImageEnabled && get("BEDROCK_IMAGE_REGION") != ImageRegion {
		return s, errors.New("image model region requires explicit approved configuration")
	}
	return s, nil
}
func SettingsFromEnvironment() (Settings, error) { return SettingsFrom(os.Getenv) }
