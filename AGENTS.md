# Lokesh Platform monorepo

- Canonical root: this repository. Active runtimes are the common Next.js app at apps/portfolio and Go worker at apps/worker. apps/api and standalone studio sources are retained rollback/compatibility code; studio infrastructure remains apps/techcanvas/infra.
- Node 24+, pnpm 10.17.1. Preserve each app's lockfile. Use pnpm install:all, pnpm check and pnpm build from the root.
- Keep environment files, credentials, editorial drafts, installed dependencies, model/runtime data and generated artifacts out of Git and deployment packages.
- Preserve the existing AWS stack/resource identities. Both portfolio and API share LokeshPlatformPreview; serialize their release and promote the portfolio revision in LokeshPortfolioDomain afterward. TechCanvasFoundation is separate.
- AWS profile aws-toolkit; regional app resources stay ap-southeast-2. The existing CloudFront certificate is in us-east-1 by service requirement. Do not add cross-region applications, Lambda@Edge, WAF subscriptions or new paid services without approval.
- Paid inference and both studio processing triggers stay disabled unless explicitly approved. Code deployment does not authorize publishing blog drafts, data migration, destructive cleanup or new paid services.
- scripts/release-plan.mjs is a plan-only command. CI templates outside .github/workflows are inactive. Do not represent a plan as an enabled automatic pipeline.
- Do not delete or archive the old API/TechCanvas repositories or their runtime data without explicit authorization. Their app histories are imported here without squash.

- The combined app has not been deployed. Block the previous code-only promotion path until the common app credentials and scoped storage grants are reviewed. Use docs/unified-app-migration.md. Local development uses private .env.unified.local and .local-platform; never package these files.

- Production owner authentication is shared Cognito MFA for the editor and studio. Never re-enable password-only production sessions. Local demo passwords are explicitly separate. Preserve required software-token MFA and existing pool/client identities; callback changes need reviewed deployment. See docs/shared-owner-mfa.md.
