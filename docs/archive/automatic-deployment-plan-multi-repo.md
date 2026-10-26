> Superseded by ../automatic-deployment-plan.md after the monorepo migration. Historical design only; do not implement its cross-repository dispatch integration.

# Automatic deployment from main

Status: implementation plan only, requested 2026-10-26. No GitHub Actions workflow, AWS federation role, GitHub App, deployment secret or paid pipeline service is enabled by this document.

## Intended behavior

Every push or merge into main starts validation for the affected repository. Application code deploys automatically only after its checks and Linux build pass. A failed check leaves the live release untouched. For closely spaced commits, the controller deploys the latest eligible version; it never rolls production back to an older SHA just because that commit's CI finished later.

Infrastructure, IAM, model access, paid-service activation, database migration and DNS changes remain a separate reviewed lane. Automatic app releases preserve existing credentials, region, endpoint limits, disabled inference and disabled processing triggers. Publishing an application build does not publish draft blog posts; editorial status lives in the blog database.

## Repository ownership

| Repository | Validation/build | Production release ownership |
| --- | --- | --- |
| Lokesh-Burma/Personal-Portfolio | Portfolio tests, infrastructure tests/synthesis, Linux ARM64 standalone package, image/package checks | Central controller for both portfolio and API because they share LokeshPlatformPreview; also updates the portfolio revision parameter in LokeshPortfolioDomain |
| Lokesh-Burma/Personal-Portfolio-API | Nest build, lint, unit/HTTP tests, production Linux ARM64 package | Requests an API-code release through the central controller; does not independently update the shared stack |
| Lokesh-Burma/Tech-Canvas-AI | Root syntax/tests, cloud/infrastructure tests, bundled Lambda build, frontend packaging | Separate serialized release for TechCanvasFoundation and its allowlisted frontend objects |

The public portfolio domain, private asset stores and original TechCanvas deployment are already live. This plan adds repeatable releases to the existing system; it does not migrate data or create a replacement application stack.

## Trigger and authentication design

1. Pull requests run checks without production AWS credentials. Protect main with the checks supported by the repository's GitHub plan. Pin third-party actions to reviewed commit SHAs and package dependencies with their lockfiles.
2. A main push runs the same validation and produces an immutable release manifest containing source repository/SHA, build identity, package SHA256 and object version IDs. Build on Linux ARM64, either a verified hosted ARM runner or an explicitly configured Docker Buildx ARM64 path. Do not deploy a macOS package. Export into a clean directory and preserve internal pnpm symlinks.
3. The portfolio controller handles its own main pushes and authenticated workflow_dispatch requests from the API repository. Use a GitHub App installed only on the required repositories, with narrowly scoped Actions dispatch and Contents read permissions, rather than a personal broad-access token. Resolve the source workflow run and verify the allowlisted repository, main branch, successful checks and requested SHA; never trust dispatch input alone. If dispatch credentials are not configured, automatic API promotion stays disabled.
4. Production AWS access uses GitHub OIDC and short-lived STS credentials. Do not use the local aws-toolkit session or store static AWS keys in GitHub. Restrict audience to sts.amazonaws.com and subjects to the exact controller/TechCanvas repository production environments. Restrict those environments to main; when using environment subjects, a branch check must still be enforced by environment rules and the workflow.
5. Separate app deployment permissions from infrastructure administration. Scope uploads to existing build/frontend prefixes, CloudFormation operations to the named stacks, invocation updates to the intended functions/endpoints and PassRole to reviewed existing roles only where required. Do not give the automation AdministratorAccess or let a broadly privileged CloudFormation execution role bypass the intended scope. Infrastructure changes use a separate approved role/workflow. Generate and review the actual IAM definitions during implementation; none are applied by this plan.

AWS login has expired locally. Before enabling federation, reauthenticate and verify that the project's managed IAM experience permits the OIDC provider and scoped roles. Do not upgrade the AWS plan or enable advanced services as a workaround without approval.

## Serialization and ordering

GitHub concurrency groups are scoped to one repository. Giving the API and portfolio workflows the same group string would not serialize them across repositories. Both shared-stack deployments must therefore execute in the portfolio controller.

Use one production deployment group in that controller, cancel-in-progress=false, and the supported queue setting when implementing. A running CloudFormation deployment must finish; never cancel it midway because another commit arrived. New requests re-check release eligibility and current main/source state before changing production. Superseded requests can complete as skipped; every push runs CI, but a burst of commits need not result in an intermediate production deployment for every SHA. GitHub queue ordering is based on waiting order, so retain explicit SHA/order guards.

TechCanvas uses a separate concurrency group against its separate stack. Manual production app releases should go through the same controller to avoid colliding with automation.

## Portfolio/API release sequence

1. Read the current deployed parameter values, endpoint revisions and release manifest privately. Preserve NoEcho parameters via UsePreviousValue; never print their values. Record the prior frontend/API code object versions and the production portfolio revision for rollback.
2. Upload the validated ZIP under a SHA-addressed key in the existing private versioned artifact bucket. Check archive integrity, internal links, correct runtime/architecture, and absence of environment files, drafts, model files and installed build dependencies that are not runtime inputs.
3. Create a change set against the current application template, changing only the requested frontend or API code key/version. A normal app-code promotion may change only the corresponding immutable revision and preview endpoint routing. If the change set alters IAM, storage, auth configuration, event mappings or paid-service settings, stop and route it to infrastructure review.
4. Execute and wait for the shared stack to finish. For a portfolio release, read the new portfolio revision and update only PortfolioRevisionId in the domain stack, preserving its certificate parameter and distribution settings. An API release preserves the portfolio revision and the stable backend endpoint URL.
5. Run read-only public smoke checks: homepage/blog status, expected build identity, static image/asset loading, HTTPS/www redirects, anonymous admin rejection and API health. Run authenticated CRUD/auth fixtures locally in CI; do not put the actual owner's password in CI or create public test posts. Do not call Bedrock or activate workers to test a release.
6. Mark the manifest successful only after both stacks/endpoints are consistent and smoke checks pass. Record source SHA, artifact digest/version, revision IDs, stack events and the verification result so the deployed version can be traced to Git.
7. On rollout or smoke failure, restore the previous code object versions and production portfolio revision through reviewed CloudFormation operations. Verify public health after rollback. Restoring code is not a database rollback; schema migrations stay out of this automatic lane and must be backward-compatible.

## TechCanvas release sequence

1. Validate and bundle the actual Lambda/runtime sources with pinned dependencies. Run root, cloud, session and infrastructure checks. Preserve the currently disabled generation path.
2. Create/review a change set. App releases may replace function code only; keep owner parameters, scoped permissions, BEDROCK_USAGE_APPROVED=false and both event source mappings disabled. New IAM/model access or stateful changes require review.
3. After a successful backend update, package the frontend using the resulting stack outputs. Source public/cloud-config.json intentionally defaults to cloud=false for local development; production configuration must be generated, not copied blindly from that file.
4. Use the existing allowlisted frontend publisher, which uploads only the intended objects with encryption and no-store caching. Do not sync/delete a whole bucket. Verify the HTTPS frontend and anonymous API rejection.
5. Record previous object versions/configuration and backend versions for rollback. Preserve existing jobs/assets; no data cleanup or inferred paid quality test belongs in the pipeline.

## Cost and enablement gates

Prefer GitHub Actions over adding an always-running deployment server. Check repository visibility, included Actions minutes, ARM runner availability and artifact storage before choosing runners; do not assume CI is free. Set build/job timeouts, short artifact retention, dependency caches and sensible supersession to limit usage. Builds and CI storage are additional to the existing AWS hosting estimate. No paid CodePipeline/CodeBuild subscription is needed for this proposed path, and none is enabled now.

Enable in phases:

1. Commit/push the current code and this plan; verify remote heads. No new AWS deployment is triggered by our work because no workflow is installed yet. A pre-existing Vercel Git integration may still build its own project; it is separate from AWS and should be inspected before cleanup.
2. Implement PR/main checks without deployment credentials. Verify reproducible packages and build manifests from Git alone.
3. Add scoped OIDC roles, GitHub environment restrictions and the narrow cross-repository dispatch integration after their concrete permission review. Confirm compatibility with the current AWS project experience and CI budget.
4. Test controller serialization and rollback against a safe release; then enable automatic application-code releases on main. Keep infrastructure changes gated.

Acceptance criteria: successful main changes deploy without a local Mac or interactive AWS login; failed checks cannot deploy; concurrent portfolio/API pushes cannot race the shared stack; deployment is traceable to exact SHAs; rollback restores a known-good release; no credentials/drafts reach Git or packages; automatic releases cannot enable paid inference or migrate/delete production data.

## Primary sources

- GitHub workflow triggers: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- OIDC with AWS: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- Concurrency, repository scope and queue behavior: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
