# TechCanvas

The active Studio runs inside the [common web app](../portfolio). Its shared modules live in `../portfolio/lib/studio`.

- [infra](infra) manages Cognito authentication, jobs, private assets, queues and worker deployment.
- `public/` retains the legacy static Studio for rollback. Its distribution and default HTTP API endpoint are disabled.

Use `pnpm dev` from the repository root for local development. Processing triggers and paid inference remain disabled.

See the [architecture](../../docs/architecture.md) and [release guide](../../docs/unified-app-migration.md).
