# Operations

## Validate source

Run pnpm install:all, pnpm check and pnpm build from the root. pnpm test:integration exercises the common app and its production authentication boundary without AWS calls. pnpm test:browser checks the real local UI at desktop/mobile widths. These are regression checks, not proof of live IAM access or a completed Cognito MFA challenge.

The retained rollback API can be rebuilt and checked with pnpm --dir apps/api install --frozen-lockfile --ignore-scripts, pnpm --dir apps/api build, pnpm --dir apps/api test --runInBand and pnpm --dir apps/api test:e2e --runInBand. Its AWS runtime uses DynamoDB; the retained database adapter/module dependencies are still part of that application source.

Infrastructure validation: pnpm infra:synth. Local templates and tests check resource identities, private retained storage, signed origins, cache behavior and explicit inference/trigger gates. Synthesized inventory is not a live resource inventory.

## Package and release

pnpm build:aws --target portfolio exports the Linux ARM64 common web artifact. --target worker exports the Go bootstrap. Legacy rollback API reproduction uses apps/api/aws/Dockerfile.build with apps/api as its Docker context. Builders preserve internal dependency symlinks and exclude private configuration, drafts and local data. Export into a fresh destination; old Docker local-export files can otherwise persist.

pnpm release:plan describes the manual common-app release without executing AWS operations. Follow unified-app-migration.md before promotion. Keep old resource identities, exact object versions and web revision IDs from the approved deployment/change set for rollback. Do not delete retained endpoints, queues, tables, pools, buckets or artifacts as part of repository cleanup.

No automatic pipeline is installed. If one is approved later, require passing checks, pinned actions, short-lived OIDC credentials, serialized promotions and immutable rollback artifacts. Resource migrations, inference activation and publishing are separate decisions.

## Existing production validation

apps/portfolio/scripts/check-custom-domain.mjs is the retained pre-cutover browser smoke tool. It requires --allow-test-writes because it creates and removes a temporary draft, and it expects the legacy password-based API. Use only with explicit test-write approval; do not treat it as the combined-app MFA test. The new common app uses the root integration/browser checks and a real approved staged MFA verification at release.

The studio's infra/bin/package-site.mjs and publish-site.mjs are retained to reproduce the disabled legacy static studio. Its optional live contract test writes isolated TEST partitions and cleans them; it is not a default local test and must target an approved table. No model invocation is needed for those storage checks.

The 2026-10-26 authenticated release verified all four application stacks, promoted the common app and deployed the paused Go worker. The owner confirmed both private areas open with the same real MFA login. Legacy API/preview endpoints now require IAM; old static hosting and the default studio HTTP API are disabled. Unreferenced code revisions were removed without deleting content, identity, queues or rollback versions. No EC2, EBS, Elastic IP, NAT or RDS resources were found in the selected region. Unknown historical logs were left untouched.

Use ~/.local/bin/aws with --profile aws-toolkit --region ap-southeast-2. An older /usr/local/bin/aws installation cannot read this login profile correctly. Reauthenticate when needed; never store exported credentials or private change-set parameters in Git.

The 2026-10-31 release promoted the Indigo UI, library reviews, usage views and browser exports. The owner subsequently approved Nova Lite text generation, Nano Banana images and both processing mappings. Image attempts remain one per UTC day and five per month; no quota counters were reset. Refinement and Bedrock image generation remain inactive. The private Gemini key is configured only on the worker; no private style reference was uploaded. Previous immutable revisions and artifacts remain available for rollback.

## Media and private data

Published blog media uses content-addressed filenames under public/images/blog, cached immutably. Preserve the existing published architecture image. For new media, use a new hash/URL; do not overwrite an existing immutable URL. Publishing a post is an explicit owner action after review, not a code deployment side effect. Signed private preview URLs are not durable public covers.

Editorial files under content/drafts are ignored and excluded from packages. Existing authored drafts were preserved locally and removed from the tracked source index. Keep environment files, .local-platform, studio data, dependencies and generated build artifacts outside source control. Do not delete user content or runtime data during routine cleanup.

## Cost and change controls

The target is roughly ₹1,000/month across hosting, storage, logs, transfer and any separately approved inference; it is not a billing cap. Stale price snapshots and prototype estimators were removed. Obtain current regional rates and measure billed runtime/environment lifetime, storage, traffic and logs before enabling a model or changing capacity; request count alone is not enough. Preserve the owner-approved provider and quota settings; further activation or quota increases require approval. Never reset quota counters to recover a job.

Prefer the existing on-demand services. Do not add GPU instances, provisioned model capacity, paid feature upgrades, new regions or an always-on container fleet for this workload without approval. Code changes do not authorize deployment, data migration, invitations, draft publication or resource deletion.

## Image processing

Production uses `imageGeneration=true` with `commonApp` and `cloudJobWrites` in the web stack. The foundation uses `goWorker`, `nanoBanana` and `processingTriggers`. These contexts are recorded in the respective cdk.json files; key values must never be supplied through context.

The worker uses `IMAGE_PROVIDER=gemini`, `GEMINI_IMAGE_USAGE_APPROVED=true` and the server-only `GEMINI_API_KEY`, supplied through a `GeminiApiKey` NoEcho parameter. Preserve the existing value on routine updates. Lambda encrypts the environment at rest; administrators with configuration access can read it. Never put the key in source, logs, artifacts or browser configuration.

Nova Lite remains the text provider. Its exact regional model is the only Bedrock invocation grant. `BEDROCK_IMAGE_USAGE_APPROVED` remains false; direct Stability AI and image refinement remain inactive. Both existing processing mappings are enabled. The worker has a 180-second timeout; the FIFO queue visibility timeout is 1,200 seconds.

To pause generation, stage `imageGeneration=false`, `processingTriggers=false` and `nanoBanana=false` through reviewed stack changes, retaining the same identities and stored data. Preserve the previous revision for coordinated rollback. Inspect outbox and all queue counts before any reactivation; never purge messages or reset quotas as a shortcut.

## Limits and quality

Image attempts are reserved transactionally: one per UTC day and five per UTC month, including failed or uncertain provider requests. The daily window resets at 05:30 IST. Each request asks for one 1K image with a 4,096-token output cap; there are no automatic inference retries, redirects or model fallbacks. These are attempt limits, not a currency cap. Text generation keeps its separate existing quotas.

Nano Banana uses the versioned `techcanvas-dimensional-v1` written recipe. Optional `GEMINI_STYLE_REFERENCE_KEY` requires a separately approved private content-addressed upload and exact object read grant; it is currently unset. Never package authored drafts as code assets. Review generated labels and arrow direction before sharing or publishing.

## Studio library and exports

Library queries are owner-scoped and bounded. Review markers update metadata only. PNG, 1200×630 social, 1600×2000 poster and printable PDF exports reuse saved assets without new inference or publication.

Refinement requires separate web/worker approval flags and a scoped private parent-image read grant. Usage estimates cover known app-worker token usage only; unknown-cost attempts, provider balance, earlier manual trials, AWS charges, taxes and exchange fees are not inferred. Publication remains a separate owner action.
