# TechCanvas background worker

A Go Lambda worker for queued TechCanvas jobs. It validates messages, reserves quota, prevents duplicate generation and saves private draft assets. Visuals are rendered SVGs; image-model generation is not implemented.

The worker is deployed as a Linux ARM64 binary using `provided.al2023`. Both processing triggers and paid inference remain disabled, and its role has no Bedrock invocation permission.

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
