package main

import (
	"context"
	"flag"
	"fmt"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/awsio"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/gemini"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/stability"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"io"
	"log"
	"os"
	"path/filepath"
)

func main() {
	promptFile := flag.String("image-prompt-file", "", "Explicit bounded prompt file for a direct Stability trial")
	imageTrial := flag.Bool("stability-trial", false, "One direct Core image from curated notes; no AWS calls")
	demo := flag.Bool("demo", false, "Run a local curated fixture: no AWS calls or credentials")
	topic := flag.String("topic", "Cache Aside", "Curated demo topic")
	output := flag.String("output", ".build/demo", "Local demo output directory")
	flag.Parse()
	if *imageTrial {
		if *demo || os.Getenv("STABILITY_USAGE_APPROVED") != "true" {
			log.Fatal("The image trial needs explicit STABILITY_USAGE_APPROVED=true and cannot run with demo mode")
		}
		if !stability.ValidKey(os.Getenv("STABILITY_API_KEY")) {
			log.Fatal("Stability API key is missing or invalid; no request made")
		}
		destination := *output
		explicitOutput := false
		flag.Visit(func(f *flag.Flag) {
			if f.Name == "output" {
				explicitOutput = true
			}
		})
		if !explicitOutput {
			destination = ".build/stability-trial"
		}
		customPrompt := ""
		if *promptFile != "" {
			file, err := os.Open(*promptFile)
			if err != nil {
				log.Fatal("Trial prompt file unavailable; no request made")
			}
			body, err := io.ReadAll(io.LimitReader(file, 2401))
			_ = file.Close()
			if err != nil {
				log.Fatal("Trial prompt file unavailable; no request made")
			}
			customPrompt = string(body)
			if customPrompt == "" {
				log.Fatal("Trial prompt is empty; no request made")
			}
		}
		if err := runImageTrialWithPrompt(context.Background(), *topic, destination, &stability.Provider{APIKey: os.Getenv("STABILITY_API_KEY"), Approved: true}, customPrompt); err != nil {
			log.Fatal(err)
		}
		return
	}
	if *promptFile != "" {
		log.Fatal("Image prompt files require --stability-trial")
	}
	if *demo {
		if err := runDemo(*topic, *output); err != nil {
			log.Fatal(err)
		}
		return
	}
	settings, err := awsio.SettingsFromEnvironment()
	if err != nil {
		log.Fatal("Invalid worker configuration")
	}
	w := &engine.Worker{Enabled: settings.Enabled, ImageEnabled: settings.ImageEnabled, RefineEnabled: settings.GeminiRefinementEnabled, TrialJobID: settings.TrialJobID}
	if settings.Enabled {
		cfg, err := awsio.Configuration(context.Background())
		if err != nil {
			log.Fatal("AWS configuration unavailable")
		}
		w.Repo = &awsio.Repository{Table: settings.Table, Client: dynamodb.NewFromConfig(cfg)}
		w.Assets = &awsio.Assets{Bucket: settings.Bucket, Client: s3.NewFromConfig(cfg)}
		w.Provider = &awsio.Provider{Client: bedrockruntime.NewFromConfig(cfg)}
		if settings.ImageEnabled {
			if settings.ImageProvider == "gemini" {
				images := &gemini.Provider{APIKey: settings.GeminiAPIKey, Approved: true}
				if settings.GeminiStyleReferenceKey != "" {
					reference := &awsio.StyleReference{Bucket: settings.Bucket, Key: settings.GeminiStyleReferenceKey, Client: s3.NewFromConfig(cfg)}
					images.Reference = reference.Load
				}
				w.Images = images
			} else if settings.ImageProvider == "stability" {
				w.Images = &stability.Provider{APIKey: settings.StabilityAPIKey, Approved: true}
			} else {
				w.Images = &awsio.ImageProvider{Client: bedrockruntime.NewFromConfig(cfg, func(o *bedrockruntime.Options) { o.Region = awsio.ImageRegion }), Approved: true, Region: awsio.ImageRegion}
			}
		}
	}
	lambda.Start(engine.Handler(w, settings.Owner))
}
func runDemo(topic, output string) error {
	c, err := engine.DemoContent(topic)
	if err != nil {
		return err
	}
	repo := engine.NewMemoryRepository()
	owner := "11111111-1111-4111-8111-111111111111"
	id := "0000000000-22222222-2222-4222-8222-222222222222"
	ctx := context.Background()
	if err = repo.Commit(ctx, []engine.Change{{PK: "OWNER#" + owner, SK: "JOB#" + id, Value: engine.Item{"kind": "job", "id": id, "owner": owner, "topic": topic, "status": "queued", "revision": 0, "attempts": 0}}, {PK: "OWNER#" + owner, SK: "QUEUE", Value: engine.Item{"kind": "slots", "count": 1}}}); err != nil {
		return err
	}
	w := &engine.Worker{Repo: repo, Provider: engine.DemoProvider{Content: c}, Assets: engine.DirectoryAssets{Directory: output}, Enabled: true, Demo: true}
	if err = w.Work(ctx, engine.Message{Owner: owner, ID: id, Revision: 0}); err != nil {
		return err
	}
	job, err := repo.Get(ctx, "OWNER#"+owner, "JOB#"+id)
	if err != nil {
		return err
	}
	if job["status"] != "completed" {
		return fmt.Errorf("demo did not complete")
	}
	abs, _ := filepath.Abs(output)
	fmt.Fprintf(os.Stdout, "Go worker demo completed: 8 draft assets in %s. No AWS calls or paid inference.\n", abs)
	return nil
}
