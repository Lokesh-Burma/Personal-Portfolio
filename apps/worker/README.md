# TechCanvas background worker

A Go Lambda worker for queued TechCanvas jobs. It generates validated text with regional Nova Lite and optional Nano Banana images, then saves private draft assets. Production processing is enabled following owner approval on 2026-10-31.

The worker runs a Linux ARM64 ZIP on `provided.al2023`. Docker is used for builds only. Existing DynamoDB-stream and SQS mappings dispatch jobs; duplicate delivery does not repeat model requests.

## Local checks and build

Requires Go 1.27.3. Run from the repository root:

```sh
pnpm demo:worker
pnpm check --target worker
pnpm worker:build
pnpm build:aws --target worker
```

The demo uses curated content and local storage without AWS or model calls. Tests use fake providers. Production infrastructure lives in [../techcanvas/infra](../techcanvas/infra).

## Production configuration

`IMAGE_PROVIDER=gemini`, `GEMINI_IMAGE_USAGE_APPROVED=true` and the parent worker/cloud/text gates enable images. The server-only key is supplied through the masked `GeminiApiKey` stack parameter into `GEMINI_API_KEY`. Preserve it on routine updates; never commit keys or put them in CDK context, artifacts, logs or browser configuration.

The fixed model is `gemini-nano-banana-2.1` through generateContent. Requests ask for one 1K, 3:2 image with minimal thinking and a 4,096-token output cap. PNG/JPEG responses are validated and saved as private PNGs. Bedrock image generation and the retained Stability adapter are inactive.

## Limits and failure handling

One image attempt per UTC day and five per UTC month, reserved transactionally across original and refinement jobs. Failed or uncertain calls stay counted. Redirects, automatic inference retries and model fallback are disabled. Image failure preserves the text pack. Text has separate existing quotas.

The worker timeout is 180 seconds; the queue visibility timeout is 1,200 seconds. Token usage is stored with a usage-based USD estimate; unknown outcomes remain unknown. Estimates exclude provider balance, taxes, exchange fees and AWS charges.

## Visual style and refinement

The active `techcanvas-dimensional-v1` written recipe uses a navy canvas, cyan/lavender accents, dimensional icons and numbered flows. Outputs still require review for labels and arrow direction.

The optional `GEMINI_STYLE_REFERENCE_KEY=style-references/<sha256>.jpg` or `.png` is currently unset. Enabling it requires approval for the private upload and exact S3 read grant. The worker validates its hash, format, byte size and dimensions before inference.

Image refinement is implemented but inactive. It requires separate web/worker approval flags and an owner-scoped parent-image read grant. It creates a child job and preserves the original image.

See [operations](../../docs/operations.md) and [release and rollback](../../docs/unified-app-migration.md) for activation and pause controls.
