# Automatic deployment from the monorepo

Current canonical repository: Lokesh-Burma/Personal-Portfolio. This plan supersedes archive/automatic-deployment-plan-multi-repo.md. The repo consolidation and local tooling are implemented. Automatic production deployment and AWS federation remain disabled until their permissions are configured/reviewed. No cross-repository dispatch, GitHub App or personal dispatch token is needed now.

## One main-branch flow

```
PR / push to main
  → select affected apps
  → locked dependency install + checks
  → Linux ARM64 packages and SHA-addressed release manifest
  → one serialized production release
  → public smoke checks
  → record success, or restore the previous release
```

Every main push runs validation. Only successful, eligible source revisions can deploy. Closely spaced commits may be superseded by the latest passing version; never deploy an older SHA just because its CI completed later. GitHub queue order alone is not a source-order guarantee.

| Changed paths | Release targets |
| --- | --- |
| apps/portfolio/** | Portfolio code, then production portfolio revision promotion |
| apps/api/** | API code; stable backend endpoint URL remains unchanged |
| apps/techcanvas/** | Studio backend/frontend in TechCanvasFoundation; shared content/worker contracts include Go checks |
| apps/worker/** | Go worker checks/build and studio compatibility; runtime switch remains a reviewed infrastructure action |
| infra/** | Portfolio + API infrastructure review; no automatic resource changes |
| scripts/**, ci/**, package.json | Validate all apps; review deployment-tool changes |
| docs/** | Documentation checks; no application deployment needed |

The selection rules live in scripts/workspace-config.mjs and are tested. Shared API/contracts or auth behavior changes must include both consumers in their compatibility checks even when only one source directory changed.

## Commands implemented now

- pnpm install:all: frozen app dependencies and pinned infrastructure dependencies.
- pnpm check: root tooling, portfolio, API build/tests/lint and studio/cloud/infrastructure checks.
- pnpm build: build both app servers and studio handlers from one root.
- pnpm build:aws --target all: isolated Linux ARM64 Docker builds to fresh .artifacts/timestamp directories; bundle studio handlers separately.
- pnpm release:plan --target all: one shared-stack update for both apps, portfolio promotion second, studio stack separately. It makes no AWS calls and rejects mutation flags.

The build files remain app-local to preserve working standalone packaging and lockfiles. This is one source repository with isolated dependency boundaries, not an unnecessary shared-package/lockfile rewrite.

## Production controller

Use one workflow and one production concurrency group in this repository, cancel-in-progress=false. A running CloudFormation operation must finish before another release starts. The controller can coordinate all apps without GitHub cross-repository credentials. Use supported queue settings and verify the requested source SHA is still eligible before each deployment.

1. Build a manifest from the exact monorepo SHA containing selected apps, package SHA256, immutable S3 keys/versions and previous deployed revisions. Exclude .env, editorial drafts, runtime/model data and build dependencies from artifacts; preserve internal relative pnpm links. Never export into a dirty artifact directory.
2. For portfolio/API code changes, create one reviewed change set against the existing LokeshPlatformPreview template, replacing only the selected code key/version parameters. Preserve all owner/secret/origin parameters through UsePreviousValue. Reject IAM, storage, auth, event-trigger or paid-service mutations from the automatic app-code lane.
3. Wait for the shared stack. When the portfolio changed, read its new verified revision and update PortfolioRevisionId in LokeshPortfolioDomain. Preserve certificate, domain, caching and other settings. API-only releases need no domain-stack revision update.
4. For TechCanvas changes, bundle its handlers, review the code-only TechCanvasFoundation changes and preserve OwnerSubject, disabled processing triggers, missing Bedrock permission and BEDROCK_USAGE_APPROVED=false. Package its frontend from the resulting stack outputs and use the existing allowlisted encrypted/no-store publisher, not bucket sync/delete.
5. Verify HTTPS/public pages, API health, static assets and anonymous admin rejection. Keep authenticated CRUD/auth fixture checks in local CI tests; do not put the owner's actual password into CI or publish synthetic test posts. Do not call paid inference as a deployment smoke check.
6. Record success only after endpoints and public health match the manifest. Keep prior artifact versions/revisions for rollback. On failure restore the prior code versions and production portfolio revision, then verify health. Code rollback does not roll back data.

All stack names and construct/resource identities remain unchanged. The repository move itself does not need a production deployment. Main pushes must not change blog draft publication status; that remains an explicit editorial action in DynamoDB.

## AWS access and gates

Use GitHub OIDC with short-lived STS credentials, not static AWS keys or a developer's expiring aws-toolkit login. Restrict the trust audience to sts.amazonaws.com and subject to the exact canonical repository production environment; restrict that environment to main. Separate untrusted PR validation from production credentials.

Create narrowly scoped application-deployment permissions: uploads only to existing release/site prefixes, operations only on the named stacks/functions/endpoints, and PassRole only where explicitly needed. Do not grant AdministratorAccess or reuse a broadly privileged CloudFormation execution role to bypass the intended scope. Generate/review the concrete IAM configuration during implementation. Verify that the current managed AWS project experience permits OIDC and the roles; no paid-plan or advanced-service upgrade is implicit.

Infrastructure changes, IAM/model permissions, new paid services, data migrations, DNS changes and paid inference activation remain a separate approval lane. Enforce these boundaries in change-set checks and permissions, not only workflow comments. Use the branch/environment protections supported by the actual GitHub plan; if enforced review is unavailable, keep the infrastructure lane manual.

## CI template and next enablement steps

ci/workflow-templates/checks.yml is an inactive template, outside .github/workflows. It runs on PR/main once deliberately installed, using pinned official actions and Node 24. It grants no AWS identity token and contains no deployment job.

1. Review the consolidated repo and verify the existing source histories and reproducible builds.
2. The root vercel.json disables legacy automatic Vercel Git builds for this AWS-hosted repository. Confirm the provider has picked up that configuration; a future intentional Vercel deployment must use apps/portfolio as its root. Vercel DNS and the AWS-served custom domain are unaffected.
3. Enable only the check workflow after verifying GitHub runner/minute availability and repository settings. It can later use affected-target optimization.
4. Implement the manifest-driven deployment executor, concrete OIDC/role permissions and production environment restrictions; test serialization and rollback.
5. Enable automatic app-code promotion on main after those checks pass. Preserve infrastructure and paid-service gates.

Check included Actions minutes, ARM runner availability and artifact storage rather than assuming CI is free. Apply timeouts, short artifact retention and reasonable supersession. The existing AWS hosting target remains traffic-dependent; this plan creates no deployment server, CodePipeline, CodeBuild or other paid service.

## Primary references

- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency

The Go worker adds a fourth source target, not a new stack or repository. Its optional provided.al2023 runtime reuses GenerationWorker and keeps triggers/inference disabled. A Node→Go runtime change is excluded from automatic code-only promotion and requires its own reviewed release. Runtime/container details are in runtime-and-containers.md.
