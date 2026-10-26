# Automatic deployment plan: common app and Go worker

Status: inactive proposal. No workflow has been installed under .github/workflows and no AWS deployment role has been enabled by this implementation.

The active targets are one Next.js web app (apps/portfolio) and one Go background worker (apps/worker). Changes to web pages, native API routes or studio modules build the common web artifact. Shared studio contracts also run Go compatibility checks. Old API/studio target aliases resolve to the common app; retained previous application sources are not independent release targets.

A future main-branch pipeline should run frozen dependency installation, pnpm check, pnpm build, pnpm test:integration, browser checks and Linux ARM64 packaging. Pin actions, give checks read-only permissions, use short-lived GitHub OIDC credentials for the release job, serialize production promotions and record immutable artifact hashes/revisions for rollback. Keep model activation, resource migrations and draft publishing outside automatic code deployment.

Before enabling that pipeline, complete the approved common-app migration in unified-app-migration.md. The existing frontend infrastructure lacks native blog credentials/storage grants and still describes the old split app. scripts/release-plan.mjs blocks the previous code-only release path; do not remove that block until staged cloud authentication, ownership and storage tests pass. Shared owner login also needs an explicit MFA/security decision before production cutover.

Once the runtime/infrastructure migration is approved and validated, web code-only changes can automatically update the common web revision and promote it through the existing custom-domain stack. Go code changes need their own event-worker artifact lane after the Go runtime is approved. Preserve resource identities, keep both processing triggers and paid inference disabled, and do not automatically retire old endpoints/resources.

The template in ci/workflow-templates/checks.yml remains review material, not an enabled pipeline. Account for runner minutes and artifact retention before activation. AWS hosting targets roughly ₹1,000/month; actual usage and billing must be measured.
