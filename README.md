# Lokesh Platform

One repository for the portfolio, its API and TechCanvas. The applications keep separate runtime, authentication and storage boundaries while sharing development and release tooling.

```
apps/
  portfolio/        Next.js portfolio, writing editor and public assets
  api/              NestJS blog API, PostgreSQL/DynamoDB adapters
  techcanvas/       Visual learning studio and its cloud backend
    infra/          Existing TechCanvasFoundation stack and runtime
infra/              Existing portfolio data, app and custom-domain stacks
scripts/            Shared check/build/release-plan commands
ci/                 Inactive workflow templates
```

Canonical repository: https://github.com/Lokesh-Burma/Personal-Portfolio

## Quick start

Use Node 24+ and pnpm 10.17.1. The root package has no dependencies. Each application keeps its existing lockfile and isolated package configuration; no Turborepo or cross-project dependency hoisting is needed.

```sh
pnpm install:all
pnpm check
pnpm build
pnpm dev:portfolio
# Separate terminals as needed:
pnpm dev:api
pnpm dev:techcanvas
```

Configure private environment files inside the corresponding app directory using its examples. Existing local portfolio credentials were moved to apps/portfolio/.env.local and remain ignored. The API's Docker Compose/PostgreSQL setup remains in apps/api. TechCanvas's existing external Ollama service can still be used; model files and runtime data are not imported into Git.

## One release entry point

```sh
pnpm release:plan                       # all apps; no AWS calls
pnpm release:plan --target portfolio
pnpm release:plan --target api
pnpm release:plan --target techcanvas
pnpm build:aws --target all             # local Docker builds, no upload
pnpm infra:synth                       # reviewed templates, no deploy
```

Linux packages are exported into a fresh .artifacts/timestamp directory. TechCanvas's bundled handlers remain under apps/techcanvas/infra/build; its site is packaged from approved live outputs. Preserve internal dependency symlinks when zipping. Docker must be running; this Mac uses the existing Colima profile techcanvas. Use the standard Docker credential configuration appropriate to your machine.

Portfolio and API releases update their shared stack together when both change. A frontend release then promotes the new PortfolioRevisionId in the domain stack. TechCanvas keeps its separate stack. The release-plan command explains this order and refuses deployment flags; it never uploads, provisions or deploys automatically.

Automatic deployment is not enabled yet. The [updated plan](docs/automatic-deployment-plan.md) now needs one repository/workflow and no cross-repository dispatch or GitHub App. App-only changes can be selected by path; shared infrastructure changes include both portfolio and API. Workflow templates stay outside .github/workflows until deliberately enabled.

## Checks and history

`pnpm check` runs root orchestration tests, portfolio tests, API build/unit/HTTP/lint checks, both infrastructure test suites and TechCanvas syntax/tests. `pnpm build` builds both servers and bundles the studio backend. After those builds, `pnpm test:browser` checks the real Next-to-Nest workflow with an isolated fixture database; set CHROME_EXECUTABLE if Chrome is not at the macOS default path.

The API and TechCanvas histories were imported with git subtree without squash. Their original commits remain ancestors of this repository. Original repositories are retained as migration references, not deleted or archived. See [migration record](docs/monorepo-migration.md).

## Production

- Portfolio: https://lokeshburma.com
- Studio: linked from https://lokeshburma.com/techcanvas
- Production stack names, resource identities, DNS and owner logins are unchanged by the repository move.
- Paid inference and processing remain disabled. Infrastructure changes, migrations and paid-service activation retain their approval gates.
- Blog publication state is stored in DynamoDB; code commits do not publish drafts. Private editorial files, environment files, installed dependencies, model/runtime data and generated bundles are excluded from Git.

See [custom domain](docs/custom-domain.md), [media publication](docs/blog-media-publication.md) and the application READMEs for implementation details. Historical documentation may describe the pre-monorepo rollout; this README and the migration/deployment plan define current paths.

The root vercel.json disables legacy automatic Vercel Git builds for this AWS-hosted repository. DNS remains managed in Vercel; this configuration does not change domain records. If intentionally returning to Vercel hosting later, review this setting and configure apps/portfolio as the project root.
