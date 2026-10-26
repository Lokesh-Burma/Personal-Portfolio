# Current production content API

This NestJS application remains necessary for today's deployed blog API and portfolio login. The common Next.js replacement is in ../portfolio but has not been promoted. Do not remove this source or its deployment resources before the approved cutover.

Use this directory's frozen lockfile to install/build/test. AWS uses BLOG_STORAGE=dynamodb and the settings in aws/environment.example. aws/Dockerfile.build exports its Linux ARM64 package. Offline sample-post/Postgres migration tooling was removed because that migration was declined and is not part of the current system.

Operational and cutover instructions are in ../../docs/operations.md and ../../docs/unified-app-migration.md.
