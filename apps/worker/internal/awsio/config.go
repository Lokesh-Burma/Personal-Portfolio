package awsio

import (
	"errors"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/stability"
	"os"
	"regexp"
)

var ownerID = regexp.MustCompile(`^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$`)

type Settings struct {
	Enabled              bool
	ImageEnabled         bool
	TrialJobID           string
	ImageProvider        string
	StabilityAPIKey      string
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

	s.ImageProvider = get("IMAGE_PROVIDER")
	if s.ImageProvider == "" {
		s.ImageProvider = "bedrock"
	}
	switch s.ImageProvider {
	case "bedrock":
		s.ImageEnabled = s.Enabled && get("BEDROCK_IMAGE_USAGE_APPROVED") == "true"
		if s.ImageEnabled && get("BEDROCK_IMAGE_REGION") != ImageRegion {
			return s, errors.New("image model region requires explicit approved configuration")
		}
	case "stability":
		s.ImageEnabled = s.Enabled && get("STABILITY_USAGE_APPROVED") == "true"
		if s.ImageEnabled {
			s.StabilityAPIKey = get("STABILITY_API_KEY")
			if !stability.ValidKey(s.StabilityAPIKey) {
				return s, errors.New("direct Stability requires a private API key")
			}
		}
	default:
		return s, errors.New("unsupported image provider")
	}

	s.TrialJobID = get("TECHCANVAS_TRIAL_JOB_ID")
	if s.TrialJobID != "" && !engine.JobID.MatchString(s.TrialJobID) {
		return s, errors.New("invalid trial job identity")
	}
	return s, nil
}
func SettingsFromEnvironment() (Settings, error) { return SettingsFrom(os.Getenv) }
