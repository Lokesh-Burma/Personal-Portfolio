# Operations

## Validate source

Run pnpm install:all, pnpm check and pnpm build from the root. pnpm test:integration exercises the common app and its production authentication boundary without AWS calls. pnpm test:browser checks the real local UI at desktop/mobile widths. These are regression checks, not proof of live IAM access or a completed Cognito MFA challenge.

The still-deployed API can be rebuilt and checked with pnpm --dir apps/api install --frozen-lockfile --ignore-scripts, pnpm --dir apps/api build, pnpm --dir apps/api test --runInBand and pnpm --dir apps/api test:e2e --runInBand. Its AWS runtime uses DynamoDB; the retained database adapter/module dependencies are still part of that application source.

Infrastructure validation: pnpm infra:synth. Local templates and tests check resource identities, private retained storage, signed origins, cache behavior and disabled inference/triggers. Synthesized inventory is not a live resource inventory.

## Package and release

pnpm build:aws --target portfolio exports the Linux ARM64 common web artifact. --target worker exports the Go bootstrap. Current production API reproduction uses apps/api/aws/Dockerfile.build with apps/api as its Docker context. Builders preserve internal dependency symlinks and exclude private configuration, drafts and local data. Export into a fresh destination; old Docker local-export files can otherwise persist.

pnpm release:plan is deliberately blocked for production while the combined application needs its reviewed runtime settings/storage grants and Cognito callbacks. Follow unified-app-migration.md before promotion. Keep old resource identities, exact object versions and web revision IDs from the approved deployment/change set for rollback. Do not delete retained endpoints, queues, tables, pools, buckets or artifacts as part of repository cleanup.

No automatic pipeline is installed. If one is approved later, require passing checks, pinned actions, short-lived OIDC credentials, serialized promotions and immutable rollback artifacts. Resource migrations, inference activation and publishing are separate decisions.

## Existing production validation

apps/portfolio/scripts/check-custom-domain.mjs is the retained pre-cutover browser smoke tool. It requires --allow-test-writes because it creates and removes a temporary draft, and it expects the current password-based deployed API. Use only with explicit test-write approval; do not treat it as the combined-app MFA test. The new common app uses the root integration/browser checks and a real approved staged MFA verification at release.

The studio's infra/bin/package-site.mjs and publish-site.mjs remain necessary to reproduce/update the currently deployed static studio. Its optional live contract test writes isolated TEST partitions and cleans them; it is not a default local test and must target an approved table. No model invocation is needed for those storage checks.

During the 2026-10-26 cleanup audit, AWS CLI credentials were unavailable. Repository cleanup therefore preserves the last verified production boundaries and does not claim a fresh authenticated inventory. Reauthenticate with the existing aws-toolkit profile before reviewing live state. Public HTTP checks do not establish account-level configuration.

## Media and private data

Published blog media uses content-addressed filenames under public/images/blog, cached immutably. Preserve the existing published architecture image. For new media, use a new hash/URL; do not overwrite an existing immutable URL. Publishing a post is an explicit owner action after review, not a code deployment side effect. Signed private preview URLs are not durable public covers.

Editorial files under content/drafts are ignored and excluded from packages. Existing authored drafts were preserved locally and removed from the tracked source index. Keep environment files, .local-platform, studio data, dependencies and generated build artifacts outside source control. Do not delete user content or runtime data during routine cleanup.

## Cost and change controls

The target is roughly ₹1,000/month across hosting, storage, logs, transfer and any separately approved inference; it is not a billing cap. Stale price snapshots and prototype estimators were removed. Obtain current regional rates and measure billed runtime/environment lifetime, storage, traffic and logs before enabling a model or changing capacity; request count alone is not enough. Keep paid inference and both processing triggers disabled. Never reset quota counters to recover a job.

Prefer the existing on-demand services. Do not add GPU instances, provisioned model capacity, paid feature upgrades, new regions or an always-on container fleet for this workload without approval. Code changes do not authorize deployment, data migration, invitations, draft publication or resource deletion.
