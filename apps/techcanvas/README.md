# TechCanvas shared infrastructure and rollback source

The active Studio is part of ../portfolio. public/ retains the old static frontend for rollback; its distribution and default HTTP API endpoint are disabled. infra/ still owns the shared Cognito pool/client, private assets, jobs/quotas/outbox, queues, dispatcher and deployed Go worker. Both processing mappings and paid inference remain disabled.

Canonical studio modules live in ../portfolio/lib/studio. Use pnpm dev from the root. See ../../docs/architecture.md and ../../docs/unified-app-migration.md.
