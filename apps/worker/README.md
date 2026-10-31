# TechCanvas background worker

A Go Lambda worker for queued TechCanvas jobs. It validates messages, reserves quota, prevents duplicate generation and saves private draft assets. Editable visuals are rendered SVGs. The optional PNG adapter is deployed but inactive.

The worker is deployed as a Linux ARM64 binary using `provided.al2023`. Both processing triggers and paid inference remain disabled, and its role has no Bedrock invocation permission.

Direct Nano Banana and Stability AI adapters are implemented in source and await deployment. Nano Banana uses Gemini Nano Banana 2.1 through generateContent, generates labeled draft diagrams at 1K, and validates PNG/JPEG responses before saving PNG assets.

The direct Stability AI adapter uses Stable Image Core over HTTPS and a private STABILITY_API_KEY, without Bedrock image permissions or another AWS region. Production generation remains paused. Cloud image attempts keep the one/day and five/month limits; image failures preserve the text pack.

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

## Nano Banana configuration

Select `IMAGE_PROVIDER=gemini`, set `GEMINI_IMAGE_USAGE_APPROVED=true` and supply `GEMINI_API_KEY` privately to the worker process. The existing worker/cloud/text approval gates must also be enabled: text still uses Bedrock Nova Lite. A funded Gemini account is required; ChatGPT or Gemini consumer subscriptions do not configure this API.

Requests are fixed to one 1K image, 3:2 aspect ratio, minimal thinking and a 4,096-token output cap. Redirects, retries, search tools and automatic model fallback are disabled. Existing image-attempt quotas remain one/day and five/month, including failed attempts. Images require human review for labels and arrow direction.

Do not commit keys or put them in CDK context, browser configuration or logs. The adapter code was deployed on 2026-10-31. Production processing remains disabled; no local keys or private style reference were uploaded.

### Consistent visual style

Nano Banana uses the versioned `techcanvas-dimensional-v1` recipe: navy canvas, cyan/lavender accents, dimensional icons, readable typography and compact numbered flows. Cache Aside includes an explicit hit/miss layout and arrow endpoints; other topics use their own validated content.

For the reference-guided quality demonstrated in the reviewed trial, configure `GEMINI_STYLE_REFERENCE_KEY=style-references/<64-character-sha256>.jpg` (or `.png`). The image is read privately from `ASSETS_BUCKET`, validated and hash-checked, then sent to Gemini as a style reference. Its topic and labels are not reused. A configured reference that fails validation stops before inference; it does not silently fall back or retry. Without this setting, generation uses the written recipe only.

The reviewed draft stays private and is not bundled into code. A future approved deployment must place the approved reference in private storage and grant the worker `s3:GetObject` for that exact object. This change performs neither action. Reference images add input-token charges. Outputs still vary and require review; neither prompts nor image validation guarantee correct text or arrows.

### Refinement and usage

Refinement jobs reuse the parent's explanation and read its private PNG, then request one Nano Banana edit into a new job. The original is preserved. `GEMINI_IMAGE_REFINEMENT_APPROVED=true` is required in addition to the image and parent gates. A future reviewed deployment must grant `s3:GetObject` only for the configured owner's parent image objects. No permissions or processing are enabled by this code change.

Each image request can report Gemini token usage. The worker atomically stores a usage-based USD estimate on the job and in its reserved UTC month's image quota record. Unknown costs remain unknown; timeouts are not refunded or automatically retried. Estimates use the dated model rates and exclude provider account balance, taxes, currency fees and AWS charges.
