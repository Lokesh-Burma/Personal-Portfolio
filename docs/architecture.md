# Architecture and deployment status

## Currently deployed

lokeshburma.com uses CloudFront with an IAM-protected Next.js Lambda Web Function origin. A separate NestJS Lambda Web Function owns the blog database and portfolio password session. DynamoDB holds posts, slug lookups and index entries. Vercel manages DNS; vercel.json disables its obsolete Git deployment integration and must remain until that project is disconnected.

The earlier TechCanvas studio is a separate S3/CloudFront frontend, Cognito MFA user pool, HTTP API, DynamoDB jobs/quota/outbox table, private asset bucket, dispatcher and Node generation worker. The processing mappings and paid inference remain disabled in the source template. These resources are not redundant until an approved cutover is verified.

| Stack | Responsibility |
| --- | --- |
| LokeshPlatformData | Retained blog table and versioned build artifacts |
| LokeshPlatformPreview | Existing portfolio/API web functions and revision endpoints |
| LokeshPortfolioDomain | Custom domain, CloudFront, signed origin and selected portfolio revision |
| TechCanvasFoundation | Existing studio frontend, owner authentication, job storage and event processing |

Regional application resources stay ap-southeast-2. The existing CloudFront certificate is in us-east-1 as required by that global service. Do not add regional services elsewhere.

## Implemented, awaiting release

One Next.js process in apps/portfolio now owns public pages, blog storage/routes, shared Cognito MFA owner authentication and the native TechCanvas studio. Browser-facing routes share /api/admin, /api/blogs and /api/techcanvas on the same hostname. No NestJS process or separate studio server is needed for this target application.

The Go event worker remains separate because queued generation has a different execution lifecycle. It preserves the existing job/message/storage contracts and quota reservations. Its optional provided.al2023 runtime selection reuses the existing worker identity and leaves triggers/inference disabled. No additional repository or always-on container fleet is needed.

Canonical studio code lives in apps/portfolio/lib/studio. The deployed event-handler entrypoints re-export those modules for compatibility. The old Ollama/SQLite prototype and unused filesystem/Supabase blog implementations were removed. The retained NestJS source cannot be removed before the production API is retired.

Real image-model generation is not implemented or enabled. Current visuals use code-rendered SVGs. Any future image provider needs a separate approved model/region/budget decision and quality trial; do not represent a model proposal as an active capability.

## Reliability boundaries

Public blog reads recheck the current post status; withdrawing a draft cannot rely on a stale index entry. Slug ownership and version updates use conditional transactions. Storage failure is reported as unavailable, rather than silently returning sample posts or claiming the library is empty.

One Cognito MFA session covers both private areas in the combined app. The existing deployed portfolio login has not changed yet. Read shared-owner-mfa.md for the implemented session checks and unified-app-migration.md for the release boundary.

Go reservations count uncertain outcomes and prevent automatic duplicate model calls. Private assets, draft creation and publishing remain distinct: generated material does not publish automatically.
