# Architecture

The production application at https://lokeshburma.com is one Next.js Lambda Web Function behind CloudFront and a signed IAM origin. It serves portfolio pages, blog APIs/editor and TechCanvas Studio. One Cognito owner login with required authenticator MFA covers both private areas. Vercel continues managing DNS; its obsolete Git deployment remains disabled.

DynamoDB retains existing blog and TechCanvas records. The common runtime has blog read/write access, studio table reads and private asset reads restricted to the configured owner prefix. Cloud generation and retries remain paused. Current production visuals are curated SVGs, not image-model output.

The separate Go Lambda worker uses the existing queue/job/asset contracts and provided.al2023 runtime. Both processing mappings are disabled, BEDROCK_USAGE_APPROVED is false and its role has no Bedrock invocation permission. Docker builds portable artifacts locally; production runs Lambda ZIP artifacts rather than an always-on container fleet.

| Stack | Responsibility |
| --- | --- |
| LokeshPlatformData | Retained blog table and versioned build artifacts |
| LokeshPlatformPreview | Common application, retained API and IAM-protected preview endpoints |
| LokeshPortfolioDomain | Domain, CloudFront, signed origin and selected common revision |
| TechCanvasFoundation | Shared Cognito, jobs/assets/queues, dispatcher and Go worker |

The legacy static studio distribution and default HTTP API endpoint are disabled. The old NestJS function and previous working portfolio revision remain for rollback; neither is the public application path. No stored content, user directory, queue or bucket was deleted.

Regional services remain ap-southeast-2; the existing CloudFront certificate in us-east-1 is the global-service exception. Public reads recheck publication status, slug/version changes use conditional transactions and storage failures surface as unavailable. Draft creation and publication remain separate owner actions. See operations.md and unified-app-migration.md for release controls.

## Prepared image-generation code

The common app now has gated cloud create/retry actions using the existing transactional job/outbox flow. The optional Go image stage stores a validated private PNG alongside editable SVG assets. Text and image stages have separate reservations; image failures preserve the text pack. This code is not yet deployed or activated.

Stable Image Core in us-west-2 is a candidate adapter, not an approved regional service. No image client is created unless both parent inference and image approval settings permit it. The committed infrastructure keeps all inference flags and processing mappings off and adds no model permissions. A separately reviewed cloudJobWrites context can grant only owner-partition PutItem access; default synthesis retains read-only Studio access for the web app.
