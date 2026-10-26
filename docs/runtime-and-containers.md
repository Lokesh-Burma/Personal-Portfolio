# Runtime and containers

The common application runs portfolio pages, blog APIs, owner authentication and TechCanvas inside one Next.js process at apps/portfolio. Go at apps/worker is the separate asynchronous generation worker. These are the two active root build targets.

Use pnpm dev from the root for the complete local web application. The first run generates private demo configuration and owner credentials under apps/portfolio/.local-platform. No NestJS process or standalone studio server is needed. Local data is single-process development storage only.

Dockerfiles:
- apps/portfolio/Dockerfile: optional common web runtime container.
- apps/portfolio/aws/Dockerfile.build: exports the Linux ARM64 Lambda ZIP contents.
- apps/worker/Dockerfile: exports Go bootstrap artifacts or runs a one-shot credential-free demo.
- apps/api/aws/Dockerfile.build: retained previous API artifact builder for rollback only.

The previous optional API/studio runtime Dockerfiles were removed. Docker is not required to host static files, and no ECS/EKS/EC2 fleet was created.

Production has not been changed by this implementation. It still runs the previous portfolio and NestJS API in Lambda Web Functions, a static studio on S3/CloudFront and disabled Node event consumers. The Go binary is prepared for a provided.al2023 event runtime but not deployed. Read unified-app-migration.md before any deployment; the common artifact needs reviewed server credentials/storage grants, and shared-login security must be approved.

For local Docker use publish ports on host loopback and pass private runtime settings explicitly. A production Next build can be tested with local demo settings only outside Lambda; local development files are excluded from build contexts and Lambda packages. Do not deploy local demo credentials/data.
