# Lokesh Platform

Reliable systems. Clearer ideas.

The portfolio, blog and TechCanvas run in one Next.js application at [lokeshburma.com](https://lokeshburma.com). One Cognito MFA login covers the blog editor and Studio. A separate Go Lambda worker handles background jobs; processing and paid inference are currently disabled.

## Local development

Requires Node.js 24+, pnpm 10.17.1 and Go 1.27.3.

```sh
pnpm install:all
pnpm dev
```

Open http://127.0.0.1:3000. Local demo credentials are generated in `apps/portfolio/.local-platform/local-login.txt`. The demo uses curated SVGs and local storage without AWS calls; it does not exercise Cognito MFA.

## Checks and builds

Run from the repository root:

```sh
pnpm check
pnpm build
pnpm test:integration
pnpm test:browser
```

Browser checks require Chrome. `pnpm build:aws --target portfolio` or `--target worker` builds Linux ARM64 artifacts using Docker. Builds do not deploy; no automatic deployment pipeline is configured.

## Repository layout

| Directory | Purpose |
| --- | --- |
| [apps/portfolio](apps/portfolio) | Common web app, native APIs and Studio |
| [apps/worker](apps/worker) | Go background worker |
| [infra](infra) | Web hosting, blog storage and custom domain |
| [apps/techcanvas/infra](apps/techcanvas/infra) | Shared authentication, jobs, assets and queues |
| [apps/api](apps/api) | Legacy API retained for rollback |
| [apps/techcanvas/public](apps/techcanvas/public) | Disabled legacy Studio retained for rollback |
| [scripts](scripts) | Local development, checks and artifact builds |

## Operations

- [Architecture](docs/architecture.md)
- [Development and operations](docs/operations.md)
- [Release and rollback](docs/unified-app-migration.md)
- [Shared MFA](docs/shared-owner-mfa.md)

Keep credentials, local data and unpublished drafts out of Git and deployment artifacts. The AWS budget target is roughly ₹1,000/month, not a hard cap. Deployment, paid inference and resource deletion require approval.
