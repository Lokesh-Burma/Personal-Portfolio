# Legacy content API

This NestJS API is retained for rollback. The production application uses native routes in [../portfolio](../portfolio); its legacy API endpoint now requires IAM access.

## Build and test

Run from this directory:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm test --runInBand
pnpm test:e2e --runInBand
```

Keep the source and lockfile until rollback support is retired. See [release and rollback](../../docs/unified-app-migration.md) before restoring this service.
