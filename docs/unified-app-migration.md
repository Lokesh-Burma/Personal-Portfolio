# Common application release and rollback

The common application was promoted on 2026-10-26 after local checks and the owner's successful staged Cognito MFA login to both Blog editor and TechCanvas Studio. Existing tables, assets, pool/client and function identities were preserved. The Go worker was deployed without enabling processing or paid inference.

## Release

1. Authenticate with the existing aws-toolkit profile and inspect live stack state. Use the current AWS CLI at ~/.local/bin/aws; older installations may not support its login credentials.
2. Run pnpm check, pnpm build, pnpm test:integration and pnpm test:browser as appropriate. Build immutable Linux ARM64 artifacts with pnpm build:aws. Never package private configuration, authored drafts or local runtime data.
3. Review synthesized templates/change sets for existing resources. Preserve commonApp, protectLegacyApi and closeCommonPreview contexts, common server settings, narrowly scoped storage grants and canonical Cognito callback. No replacement of stateful resources or activation of inference is part of a code release.
4. For authentication changes, stage the exact approved callback and complete a real MFA check before promotion. Local fixtures cannot prove live identity or IAM access. Remove temporary callbacks after verification.
5. Promote the selected immutable common revision through LokeshPortfolioDomain. Verify public pages, published article/media, guest API rejection, secure login and shared owner access. Preserve prior code/artifact versions for rollback.

## Current retirement and rollback boundary

The common revision is rev-pyfyj. Previous portfolio revision rev-jjh5n and API revision rev-wygsg are retained. The legacy API and preview endpoints require IAM. The old studio distribution and default HTTP API endpoint are disabled using retireLegacyStudio; Cognito permits only the canonical common callback/logout URLs.

Rollback is a reviewed coordinated infrastructure change: restoring only an old web revision is insufficient. Restore its required runtime settings, old API access policy, relevant legacy studio endpoints and callback URLs before selecting a prior architecture. Keep required TOTP MFA and stored data intact. Do not enable processing as part of rollback.

Unused, unreferenced code revisions may be removed only after checking every endpoint selection and stack reference. Buckets, tables, queues, pool/client and rollback source are intentionally retained. No automatic deployment pipeline is installed; scripts/release-plan.mjs only describes a manual release and performs no AWS operations.
