# TechCanvas background worker

A Go Lambda worker for queued TechCanvas jobs. It validates messages, reserves quota, prevents duplicate generation and saves private draft assets. Editable visuals are rendered SVGs. The optional PNG adapter is deployed but inactive.

The worker is deployed as a Linux ARM64 binary using `provided.al2023`. Both processing triggers and paid inference remain disabled, and its role has no Bedrock invocation permission.

The new direct Stability AI adapter is tested locally and awaits deployment. It uses Stable Image Core over HTTPS and a private STABILITY_API_KEY, without Bedrock image permissions or another AWS region. Production generation remains paused. Cloud image attempts keep the one/day and five/month limits; image failures preserve the text pack.

## Local demo and checks

Requires Go 1.27.3. Run from the repository root:

```sh
pnpm demo:worker
pnpm check --target worker
pnpm worker:build
```

The demo uses curated content and in-memory storage without AWS calls. Output is written to `apps/worker/.build/demo`; the build produces the Lambda bootstrap under `apps/worker/.build/aws`.

To select another demo topic, run from this directory:

```sh
go run ./cmd/worker --demo --topic Idempotency --output .build/idempotency
```

`pnpm build:aws --target worker` builds the artifact through Docker from the repository root. Production uses a Lambda ZIP, not a continuously running container.

Infrastructure is managed in [../techcanvas/infra](../techcanvas/infra). See [release and rollback](../../docs/unified-app-migration.md) before changing the runtime or enabling processing.

## Direct Stability trial

Set STABILITY_API_KEY privately in the process environment, then run from this directory:

```sh
STABILITY_USAGE_APPROVED=true go run ./cmd/worker --stability-trial --topic "Cache Aside" --output .build/stability-trial
```

This makes one 3-credit image request using curated reference notes and no AWS calls. The private output contains illustration.png and an attempt receipt. Reusing the output directory refuses another request, including after a timeout. No credits are purchased automatically. Keep keys and generated trial files out of Git; see [operations](../../docs/operations.md) for activation controls.

For controlled prompt comparisons, add --image-prompt-file with a private UTF-8 text file of at most 2,400 bytes. The exact prompt and checksum are saved with the attempt receipt; normal worker prompts remain unchanged.
