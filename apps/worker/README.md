# TechCanvas Go background worker

This Go service implements the existing TechCanvas generation-worker contract. It lives in the same monorepo because it shares job state, queue messages, asset formats and release coordination with the studio. The Event-API learning project is unrelated and was not moved or replaced.

## What it does

The dispatcher emits an SQS FIFO message `{owner,id,revision}` in group `owner`. The Go handler checks the configured owner and message shape, strongly reads the job, atomically reserves daily/monthly quota with the queued→running transition, invokes the fixed bounded text-model adapter, validates content and writes the same eight private asset names. It then atomically finishes the job and releases its queue slot.

Safety behavior matches the current Node worker: 20 daily / 300 monthly reserved attempts; revisions 0–1 only; 6,000-byte serialized prompt cap; 1,600 output tokens; one SDK attempt; no refunds after unknown outcomes; a live lease fails delivery; an expired interrupted attempt fails the job without another model call. Duplicate/obsolete deliveries do not regenerate. FIFO partial failures include later records. Asset output includes only approved filenames under owners/owner/jobs/job/revision, AES256 encryption and private/no-store headers.

Rendering is deterministic Go SVG/Markdown/JSON, not raster image-model generation. Local demo files are clearly marked Curated demo and portfolio exports are drafts. Reference notes and demo content are generated from the studio source through scripts/sync-worker-data.mjs; the contract check detects drift and tests the actual portfolio importer.

## Local use — no AWS calls

Go 1.27.3 is pinned in go.mod. From the repository root:

```sh
pnpm demo:worker
pnpm check --target worker
pnpm worker:build
```

The demo generates a Cache Aside pack under apps/worker/.build/demo using an in-memory repository and curated provider. To choose another curated topic or destination:

```sh
cd apps/worker
go run ./cmd/worker --demo --topic Idempotency --output .build/idempotency
```

`pnpm worker:build` produces a Linux ARM64 bootstrap and checksum manifest under .build/aws. `pnpm build:aws --target worker` uses the worker Dockerfile's artifact stage and exports a clean Linux binary/checksum directory under .artifacts. No image or ZIP is uploaded by these commands.

## Optional local container

```sh
docker build --platform linux/arm64 -t techcanvas-worker:local apps/worker
docker run --rm techcanvas-worker:local
```

The default container runs the credential-free demo once and exits. It is not a long-running SQS polling service. AWS Lambda delivers queue events when an approved event source mapping is enabled. The runtime image is optional for local portability; the prepared Lambda deployment uses the native binary in a ZIP, not a continuously billed container service.

## Production remains disabled

The live worker has not been changed. The existing default CDK path remains Node.js. An explicit `goWorker=true` context selects the Go bootstrap for the existing GenerationWorker construct, preserving its function/queue/resource identities. It requires a reviewed Linux ARM64 artifact; the asset directory rejects unexpected files and wrong architecture.

Example synthesis only, from apps/techcanvas/infra after building the artifact:

```sh
npm run synth -- -c goWorker=true
```

Both event source mappings and BEDROCK_USAGE_APPROVED remain false, and the execution role still has no Bedrock permission. Runtime activation additionally requires TECHCANVAS_GO_WORKER_ENABLED=true, CLOUD_BACKEND_READY=true, valid owner/storage settings and the approved region. No flag alone grants model permissions. Do not enable triggers or inference to test this code.

Activation is a separate reviewed release: refresh AWS authentication, recheck model access/cost, inspect the exact code/runtime/IAM change set, deploy with triggers/inference still off, then obtain explicit approval before paid processing. Rollback selects the previous Node artifact/runtime and leaves job data intact. The root app-code-only release lane must not silently switch worker runtime.

## IAM analysis

The source was analyzed with IAM Policy Autopilot; no policy was uploaded/applied. Its broad baseline includes optional/dependent permissions the implementation does not necessarily use, so it is not a deployable policy. Regenerate for review with:

```sh
DISABLE_IAM_POLICY_AUTOPILOT_TELEMETRY=true uvx iam-policy-autopilot@latest generate-policies apps/worker/cmd/worker/main.go apps/worker/internal/awsio/adapters.go --language go --region ap-southeast-2 --account 111122223333 --pretty
```

The account number above is an example placeholder. Existing scoped table/S3 grants remain the current boundary; any future model permission needs a separate review. Never pass --upload-policies without explicit authorization.
