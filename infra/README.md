# Platform infrastructure

AWS CDK definitions for the common application, blog storage and public domain.

| Stack | Responsibility |
| --- | --- |
| LokeshPlatformData | Blog table and versioned build artifacts |
| LokeshPlatformPreview | Common web function, IAM-protected preview and retained legacy API |
| LokeshPortfolioDomain | Custom domain, CloudFront and signed application origin |

TechCanvas authentication, jobs and worker resources are managed in [../apps/techcanvas/infra](../apps/techcanvas/infra).

## Validate

Run from this directory:

```sh
npm ci
npm test
npm run synth
```

Synthesis is local and does not deploy. Preserve resource identities, retained data, scoped permissions and rollback revisions. See [release and rollback](../docs/unified-app-migration.md) before applying changes.
