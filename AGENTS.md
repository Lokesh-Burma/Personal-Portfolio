# Lokesh Platform

- Intended runtimes: common Next.js app at apps/portfolio and Go worker at apps/worker. They are implemented but not yet released together. Current production still needs apps/api and apps/techcanvas/public plus their infrastructure; do not remove these before an approved, verified cutover.
- Node 24+, pnpm 10.17.1, Go 1.27.3. Preserve relevant lockfiles. Use root pnpm install:all, pnpm check, pnpm build, pnpm test:integration and pnpm test:browser.
- Keep canonical studio code in apps/portfolio/lib/studio. Retained event-handler entrypoints are compatibility wrappers, not independent copies.
- Keep only necessary source, tests and operational guidance. Do not add historical snapshots, duplicate plans or generated reports to Git. Preserve authored drafts, credentials and runtime data privately; never package them.
- Existing regional resources stay ap-southeast-2 with AWS profile aws-toolkit. The existing CloudFront certificate in us-east-1 is the global-service exception. No additional regions, Lambda@Edge, WAF/paid upgrades or new paid services without approval.
- Preserve stack/resource identities. LokeshPlatformPreview still coordinates the existing portfolio/API; LokeshPortfolioDomain promotes the selected portfolio revision. TechCanvasFoundation is separate. No cloud resource cleanup is authorized by repository cleanup.
- Shared Cognito MFA is the approved target for both private areas. Never enable password-only production sessions. Local demo credentials are explicitly separate. Preserve required TOTP MFA and pool/client identities. See docs/shared-owner-mfa.md.
- Block the previous code-only promotion path until the common runtime settings/grants and Cognito callbacks are reviewed. Follow docs/unified-app-migration.md. scripts/release-plan.mjs makes no AWS calls. No automatic deployment pipeline is installed.
- Paid inference and both processing mappings stay disabled unless explicitly approved. Code work does not authorize deployment, data migration, invitations, draft publication, quota resets or cloud/repository deletion.
- Old external API/TechCanvas repositories and runtime data remain untouched. Their histories remain in Git. See README.md, docs/architecture.md and docs/operations.md for the current boundaries.
