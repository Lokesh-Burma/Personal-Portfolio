# Existing portfolio infrastructure

These CDK definitions describe the currently deployed split portfolio/API system. LokeshPlatformData retains blog storage/build artifacts; LokeshPlatformPreview owns the two web functions; LokeshPortfolioDomain owns the public front door and selected portfolio revision.

Run npm ci, npm test and npm run synth locally. Preserve construct/resource IDs, retained data, scoped grants, signed origin access and revision rollback information. Synthesis tests do not establish live state.

The common Next.js replacement requires reviewed native storage grants, owner settings and Cognito callback configuration before promotion. Do not deploy its artifact using the old frontend-only settings. Follow ../docs/unified-app-migration.md. No deployment, data deletion or inference activation is authorized by a build.
