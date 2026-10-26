# Lokesh Platform

One Next.js application for the portfolio, writing, owner authentication and TechCanvas studio, plus one Go background worker. The active web application remains at apps/portfolio to preserve build and deployment paths.

## Run locally

Requires Node 24+, pnpm 10.17.1 and Go 1.27.3 for worker checks.

```sh
pnpm install:all
pnpm dev
```

Open http://127.0.0.1:3000. The first run creates private local configuration without overwriting your existing .env.local. Local owner login details are in apps/portfolio/.local-platform/local-login.txt. Both that directory and .env.unified.local are ignored by Git and excluded from Docker/Lambda packages. Local demo data is a single-process JSON file; it is not an AWS database replacement.

- /admin: owner login and blog editor.
- /techcanvas/studio: same owner session, topic packs, asset previews/downloads and direct Save blog draft.
- /blog: published posts only; withdrawing a post hides it immediately.
- /api/admin/*, /api/blogs/* and /api/techcanvas/*: native server routes in the same app. No HTTP bridge, NestJS process or separate studio server is needed.

The local studio uses explicitly labelled curated SVG demos. Paid text/image generation remains disabled. Saving a pack creates a private draft, never an automatic publication. JSON imports remain supported.

## Source layout

```text
apps/portfolio/             Common Next.js app and its Dockerfile
  app/techcanvas/studio/    Native React studio
  app/api/                 Blog, authentication and TechCanvas routes
  lib/blogs/               DynamoDB repository preserving existing records
  lib/studio/              Canonical studio content, rendering and job contracts
apps/worker/               Go event worker and Dockerfile (not activated)
apps/api/                  Previous NestJS source, retained for rollback/reference
apps/techcanvas/           Previous studio tooling/infrastructure compatibility
infra/                     Existing deployed portfolio/API infrastructure
scripts/                   Two-target checks/builds and integration verification
```

Old API/studio repositories and production resources have not been removed. Compatibility entrypoints use the common app's canonical studio modules. They are not additional runtime targets for the combined app.

## Verify and build

```sh
pnpm check
pnpm build
pnpm test:integration
pnpm test:browser          # Chrome; CHROME_PATH may override its location
pnpm demo:worker
pnpm build:aws --target portfolio
pnpm release:plan
```

`api`, `techcanvas` and `web` target aliases resolve to the common web app. The only active build targets are portfolio and worker. Existing lockfiles in retained rollback sources are preserved; the common app has its own frozen pnpm lockfile.

The integration check starts only Next.js with temporary local data and tests login, secure cookies, CSRF, bounded requests, studio packs, private assets, direct draft save, publishing/withdrawal and logout. It makes no AWS calls. The browser variant exercises the real UI at desktop/mobile widths.

Docker is optional for local runtime portability and Linux ARM64 artifact builds. The production runtime is still Lambda/S3/CloudFront, not a Docker fleet. See docs/runtime-and-containers.md.

## Deployment status

This consolidation is implemented and verified locally, not released to AWS. The existing stacks still describe the previous split application. The plan-only release command explicitly blocks the old code-only promotion path until the common app has reviewed owner secrets and scoped access to the existing blog/studio resources. No resources, data, DNS, Cognito settings, paid inference or processing triggers were changed.

Before deploying, follow docs/unified-app-migration.md. CI templates remain inactive; pushing main does not deploy this consolidation. The total budget target remains around ₹1,000/month. Real image generation is a separate proposal in docs/image-generation-plan.md.
