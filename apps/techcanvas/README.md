# TechCanvas

The active Studio runs inside the [common web app](../portfolio). Its shared modules live in `../portfolio/lib/studio`.

- [infra](infra) manages Cognito authentication, jobs, private assets, queues and worker deployment.
- `public/` retains the legacy static Studio for rollback. Its distribution and default HTTP API endpoint are disabled.

Use `pnpm dev` from the repository root for local development. The owner-approved Go processing path uses Nova Lite text and Nano Banana images, limited to one image attempt per UTC day and five per month.

See the [architecture](../../docs/architecture.md) and [release guide](../../docs/unified-app-migration.md).
