package main

import (
	"context"
	"flag"
	"fmt"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/awsio"
	"github.com/Lokesh-Burma/Personal-Portfolio/apps/worker/internal/engine"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"log"
	"os"
	"path/filepath"
)

func main() {
	demo := flag.Bool("demo", false, "Run a local curated fixture: no AWS calls or credentials")
	topic := flag.String("topic", "Cache Aside", "Curated demo topic")
	output := flag.String("output", ".build/demo", "Local demo output directory")
	flag.Parse()
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
	w := &engine.Worker{Enabled: settings.Enabled, ImageEnabled: settings.ImageEnabled}
	if settings.Enabled {
		cfg, err := awsio.Configuration(context.Background())
		if err != nil {
			log.Fatal("AWS configuration unavailable")
		}
		w.Repo = &awsio.Repository{Table: settings.Table, Client: dynamodb.NewFromConfig(cfg)}
		w.Assets = &awsio.Assets{Bucket: settings.Bucket, Client: s3.NewFromConfig(cfg)}
		w.Provider = &awsio.Provider{Client: bedrockruntime.NewFromConfig(cfg)}
		if settings.ImageEnabled {
			w.Images = &awsio.ImageProvider{Client: bedrockruntime.NewFromConfig(cfg, func(o *bedrockruntime.Options) { o.Region = awsio.ImageRegion }), Approved: true, Region: awsio.ImageRegion}
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
