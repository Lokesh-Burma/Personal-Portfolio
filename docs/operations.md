# Operations

## Validate source

Run pnpm install:all, pnpm check and pnpm build from the root. pnpm test:integration exercises the common app and its production authentication boundary without AWS calls. pnpm test:browser checks the real local UI at desktop/mobile widths. These are regression checks, not proof of live IAM access or a completed Cognito MFA challenge.

The retained rollback API can be rebuilt and checked with pnpm --dir apps/api install --frozen-lockfile --ignore-scripts, pnpm --dir apps/api build, pnpm --dir apps/api test --runInBand and pnpm --dir apps/api test:e2e --runInBand. Its AWS runtime uses DynamoDB; the retained database adapter/module dependencies are still part of that application source.

Infrastructure validation: pnpm infra:synth. Local templates and tests check resource identities, private retained storage, signed origins, cache behavior and disabled inference/triggers. Synthesized inventory is not a live resource inventory.

## Package and release

pnpm build:aws --target portfolio exports the Linux ARM64 common web artifact. --target worker exports the Go bootstrap. Legacy rollback API reproduction uses apps/api/aws/Dockerfile.build with apps/api as its Docker context. Builders preserve internal dependency symlinks and exclude private configuration, drafts and local data. Export into a fresh destination; old Docker local-export files can otherwise persist.

pnpm release:plan describes the manual common-app release without executing AWS operations. Follow unified-app-migration.md before promotion. Keep old resource identities, exact object versions and web revision IDs from the approved deployment/change set for rollback. Do not delete retained endpoints, queues, tables, pools, buckets or artifacts as part of repository cleanup.

No automatic pipeline is installed. If one is approved later, require passing checks, pinned actions, short-lived OIDC credentials, serialized promotions and immutable rollback artifacts. Resource migrations, inference activation and publishing are separate decisions.

## Existing production validation

apps/portfolio/scripts/check-custom-domain.mjs is the retained pre-cutover browser smoke tool. It requires --allow-test-writes because it creates and removes a temporary draft, and it expects the legacy password-based API. Use only with explicit test-write approval; do not treat it as the combined-app MFA test. The new common app uses the root integration/browser checks and a real approved staged MFA verification at release.

The studio's infra/bin/package-site.mjs and publish-site.mjs are retained to reproduce the disabled legacy static studio. Its optional live contract test writes isolated TEST partitions and cleans them; it is not a default local test and must target an approved table. No model invocation is needed for those storage checks.

The 2026-10-26 authenticated release verified all four application stacks, promoted the common app and deployed the paused Go worker. The owner confirmed both private areas open with the same real MFA login. Legacy API/preview endpoints now require IAM; old static hosting and the default studio HTTP API are disabled. Unreferenced code revisions were removed without deleting content, identity, queues or rollback versions. No EC2, EBS, Elastic IP, NAT or RDS resources were found in the selected region. Unknown historical logs were left untouched.

Use ~/.local/bin/aws with --profile aws-toolkit --region ap-southeast-2. An older /usr/local/bin/aws installation cannot read this login profile correctly. Reauthenticate when needed; never store exported credentials or private change-set parameters in Git.

## Media and private data

Published blog media uses content-addressed filenames under public/images/blog, cached immutably. Preserve the existing published architecture image. For new media, use a new hash/URL; do not overwrite an existing immutable URL. Publishing a post is an explicit owner action after review, not a code deployment side effect. Signed private preview URLs are not durable public covers.

Editorial files under content/drafts are ignored and excluded from packages. Existing authored drafts were preserved locally and removed from the tracked source index. Keep environment files, .local-platform, studio data, dependencies and generated build artifacts outside source control. Do not delete user content or runtime data during routine cleanup.

## Cost and change controls

The target is roughly ₹1,000/month across hosting, storage, logs, transfer and any separately approved inference; it is not a billing cap. Stale price snapshots and prototype estimators were removed. Obtain current regional rates and measure billed runtime/environment lifetime, storage, traffic and logs before enabling a model or changing capacity; request count alone is not enough. Keep paid inference and both processing triggers disabled. Never reset quota counters to recover a job.

Prefer the existing on-demand services. Do not add GPU instances, provisioned model capacity, paid feature upgrades, new regions or an always-on container fleet for this workload without approval. Code changes do not authorize deployment, data migration, invitations, draft publication or resource deletion.

## Image trial preparation

The image pipeline was deployed on 2026-10-27 with generation paused. Local tests use fake Bedrock/S3 clients and valid PNG fixtures; the demo remains credential-free SVG output. No test invokes a paid model.

Before a trial, review the chosen image model, its region, current rates and an explicit spending allowance. The adapter uses Stable Image Core in us-west-2; application infrastructure stays in its current region. Do not enable another region or grant model invocation merely to run local checks.

A reviewed activation must coordinate: owner-partition cloudJobWrites permissions, server-side TECHCANVAS_JOB_CREATION_APPROVED and BEDROCK_USAGE_APPROVED, worker inference permissions, and then (separately) TECHCANVAS_IMAGE_CREATION_APPROVED, BEDROCK_IMAGE_USAGE_APPROVED and BEDROCK_IMAGE_REGION. Committed values remain false/empty, and both queue mappings remain disabled. First invoke isolated approved jobs manually with triggers off; inspect existing outbox and queue records before enabling consumers so stale jobs are not processed unexpectedly.

Initial image limits are one reserved attempt per UTC day and five per UTC month, one image per requested job. These are attempt limits, not a currency cap. Text reservations keep their existing limits. Unknown outcomes are never refunded or automatically retried. A failed optional image leaves a completed text pack with an image error; publication remains manual. Private preview links expire after five minutes and must not become public article URLs.

The owner approved one paid image test, but it has not run: GetFoundationModelAvailability reported the provider agreement unavailable, and an organization service control policy denied bedrock:ListFoundationModelAgreementOffers. Resolve model agreement access with the organization administrator before enabling inference. Do not change organization policies or substitute another provider as a workaround. No quota counters or test jobs were created for this blocked trial.

The manualImageTrialJobId context prepares an isolated worker trial for one exact job ID and revision zero, with invocation limited to the fixed text/image models. It never enables event sources or web job creation. Default synthesis removes those invocation grants and keeps inference disabled. Retain the previous working revision and captured immutable artifacts when preparing any trial or rollback.

## Direct Stability AI

A direct HTTPS Core adapter avoids the blocked Bedrock image agreement. On 2026-10-29, three local requests returned validated private PNGs, each priced at three credits ($0.03), with no AWS inference or automatic credit purchase. Detailed layout instructions produced garbled labels and unreliable relationships; a simpler text-free prompt avoided gibberish but still failed the requested node roles and arrow layout. Core output is suitable only as reviewed decorative material, not an authoritative engineering diagram. Trial outputs and prompts remain private, and worker defaults were not changed by these experiments.

The adapter is implemented and tested but not yet deployed. IMAGE_PROVIDER=stability selects it; STABILITY_USAGE_APPROVED and the existing parent processing gate must both permit it. STABILITY_API_KEY is server-only and must never be put in CDK context, source, logs or browser configuration. Configure it through a reviewed private deployment before activation. The normal worker still uses Nova Lite for text; the standalone --stability-trial command uses curated notes and therefore needs no AWS inference.

The previous manualImageTrialJobId infrastructure context targets Bedrock images only; do not use it to activate the direct API. Keep event mappings and web creation off until the direct provider release is explicitly configured. Cloud quotas remain one reserved image attempt per day and five per month. The local trial command reserves one attempt per output directory and refuses to repeat an uncertain request. Generated trial images remain private and are not published automatically.
