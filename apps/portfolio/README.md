# Portfolio app

Next.js frontend, public writing and owner editor. Part of the [platform monorepo](../../README.md).

From the repository root: pnpm dev:portfolio, pnpm check --target portfolio, pnpm build --target portfolio. Environment variables remain app-local; see aws/environment.example. The API bridge is server-only. Local API testing uses the sibling ../api directory, and browser/export checks use ../techcanvas.

Linux Docker builds retain this app directory as their context. Shared production infrastructure is at ../../infra; deployment and domain documentation are at ../../docs. Private editorial content stays in content/drafts and is excluded from Git/build packages.
