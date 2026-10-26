# Lokesh Platform

Reliable systems. Clearer ideas.

One Next.js application for the portfolio, blog and TechCanvas, with one Go background worker. The combined app and shared Cognito MFA are implemented but **not deployed**. Production still uses the preceding split deployment; its necessary source remains until cutover.

## Develop

Requires Node 24+, pnpm 10.17.1 and Go 1.27.3.

```sh
pnpm install:all
pnpm dev
```

Open http://127.0.0.1:3000. The first run creates ignored local-demo configuration and credentials at apps/portfolio/.local-platform/local-login.txt. It does not overwrite .env.local, contact AWS or simulate Cognito MFA.

The app serves /login, /admin, /techcanvas/studio, /blog and their native API routes. Studio packs save directly as private blog drafts. Production-mode code uses one Cognito MFA owner session for the editor and studio; password-only login is local-demo only. Paid generation remains disabled; local visuals are labelled curated SVGs.

## Verify

```sh
pnpm check
pnpm build
pnpm test:integration
pnpm test:browser
pnpm demo:worker
pnpm release:plan
```

Browser tests require Chrome (CHROME_PATH may override its location). Linux artifacts use pnpm build:aws --target portfolio or --target worker and require Docker. These commands do not deploy. No automatic deployment pipeline is installed.

## Source boundaries

| Path | Why it remains |
| --- | --- |
| apps/portfolio | Combined Next.js app, canonical studio modules, local development and tests |
| apps/worker | Approved Go worker implementation and tests; not activated |
| apps/api | NestJS source/build/tests still needed for the currently deployed API |
| apps/techcanvas/public | Currently deployed studio frontend |
| apps/techcanvas/infra | Existing studio infrastructure, event handlers and compatibility tests |
| infra | Existing portfolio/API/data/domain stack definitions and safety tests |
| scripts | Shared checks, builds, local integration tests and release guard |

Lockfiles, tests, published media and deployment safety controls are intentional source. Private writing, configuration and runtime data are excluded. Historical plans, snapshots and removed prototypes remain recoverable through Git history.

## Operate

- [Architecture](docs/architecture.md): deployed system versus the intended application.
- [Operations](docs/operations.md): validation, builds, media, costs and change boundaries.
- [Release checklist](docs/unified-app-migration.md): staged cutover without deleting production dependencies.
- [Shared MFA](docs/shared-owner-mfa.md): authentication configuration and session behavior.

The budget target remains around ₹1,000/month. Deployment, paid inference, data changes and resource deletion require explicit authorization.
