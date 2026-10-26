# Lokesh Burma Portfolio

Personal portfolio and technical writing site built with Next.js, TypeScript, and Tailwind CSS.

## Run Locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Add A Blog Post

Create a new file in `content/blog`:

```txt
content/blog/my-new-post.mdx
```

Use this structure:

```mdx
---
title: "My New Post"
date: "2026-06-28"
tags: ["Node.js", "AWS"]
summary: "One or two lines explaining what the post covers."
---

# My New Post

Write the post here.
```

The filename becomes the URL slug. For example:

```txt
content/blog/my-new-post.mdx
```

becomes:

```txt
/blog/my-new-post
```

## Add A Project

Create a new file in `content/projects`:

```mdx
---
title: "My Project"
stack: ["NestJS", "AWS", "Docker"]
summary: "Short project summary."
outcome: "The measurable result or learning."
---

# My Project

Write the case study here.
```

The site automatically reads all files from `content/blog` and `content/projects`.

## TechCanvas integration

The local `/techcanvas` page links to the owner studio hosted on AWS. In the authenticated blog editor, import `portfolio.json` from a TechCanvas pack, review the resulting draft, then save. Imports create a new unpublished draft and do not copy expiring private cover URLs. Run `npm run test:techcanvas` to check the import contract.

See [AWS migration assessment](docs/techcanvas-aws-integration.md) for the Next.js runtime, Supabase, domain certificate and DNS requirements. These local changes have not been deployed to Vercel or migrated to AWS.

## Unified platform preview

The full TechCanvas-style redesign, API bridge and staged AWS infrastructure are described in [docs/platform-revamp.md](docs/platform-revamp.md). Deployment gates are in [infra/README.md](infra/README.md).

For local development, start the sibling `portfolio-api` using its existing PostgreSQL setup, set server-only `PORTFOLIO_API_URL=http://127.0.0.1:3001` and `SITE_ORIGIN=http://localhost:3000`, then run `pnpm dev`. Match the API's CORS_ORIGIN to that frontend origin. Leave PORTFOLIO_API_URL unset to retain the existing Supabase backend. Never expose API credentials with NEXT_PUBLIC variables.

Checks: `pnpm test`, `pnpm build`, `npm --prefix infra test`, `npm --prefix infra run synth`. After building both apps, `node scripts/check-platform-browser.mjs` starts isolated local servers with a fixture database, tests the real login/import workflow and saves screenshots under `.aws-build`. It expects sibling `portfolio-api` and `techcanvas-ai` repositories with their dependencies installed; override PORTFOLIO_API_ROOT, TECHCANVAS_ROOT and CHROME_EXECUTABLE if needed. No production writes occur in this browser check.

## Custom domain

The AWS portfolio is served at https://lokeshburma.com. Domain deployment and rollback are documented in [docs/custom-domain.md](docs/custom-domain.md). Sample blog migration was declined. Owner writes are bound to the canonical domain; use /admin there rather than the old native preview hostname. Vercel remains the DNS provider.

## Planned automatic releases

See [docs/automatic-deployment-plan.md](docs/automatic-deployment-plan.md) for the proposed main-branch CI/CD flow. It accounts for the shared portfolio/API stack, short-lived AWS authentication, serialized deployment and rollback. This is a plan; no automatic release workflow is enabled yet.
