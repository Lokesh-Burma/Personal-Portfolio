# Common web application

Portfolio, blog, shared Cognito MFA owner login and TechCanvas run in this single Next.js application. It is implemented but not yet deployed as the combined runtime.

Use pnpm dev, pnpm check and pnpm build from the repository root. Server configuration is documented in .env.example; private local-demo configuration is generated automatically and excluded from Git/builds. Canonical studio modules are in lib/studio. Published writing uses the database, not source Markdown files.

See ../../docs/architecture.md and ../../docs/operations.md. Do not use the previous frontend-only runtime settings to deploy this artifact.
