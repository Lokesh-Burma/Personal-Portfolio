# Architecture

The portfolio, blog APIs/editor and TechCanvas Studio run in one Next.js Lambda Web Function behind CloudFront at https://lokeshburma.com. The origin requires IAM signatures. One Cognito owner login with required authenticator MFA covers both private areas. Vercel manages DNS.

The web app reads/writes the existing blog table. Studio reads the jobs table and saves jobs, idempotency records, review markers and outbox entries only in the configured owner's partition. Private asset reads are restricted to that owner's job prefix. DynamoDB transactions protect job state and quota reservations.

A DynamoDB stream dispatches new outbox entries to the existing FIFO queue. The separate Go Lambda worker generates validated text with regional Nova Lite, then optionally requests one Nano Banana image through Google's API. It saves editable SVG/text assets and the validated PNG privately in S3. Both processing mappings are enabled following owner approval on 2026-10-31.

Images are capped at one reserved attempt per UTC day and five per UTC month. Failed and uncertain requests remain counted; duplicate delivery never repeats inference. Image failure preserves a completed text pack. Refinement is implemented but inactive. The written visual recipe is active; the optional private style reference has not been uploaded.

The Gemini key is server-only, supplied through a masked deployment parameter and the worker's encrypted environment. It is never sent to the web app or browser. Bedrock image invocation and Stability AI remain inactive; the worker has permission to invoke only the fixed regional Nova Lite text model.

The Indigo interface supports system/light/dark themes, a searchable concept library, review markers, usage estimates and browser image/PDF exports. Generated content remains a private draft until separately reviewed and published.

Docker builds Linux ARM64 ZIP artifacts locally. Production uses a Node.js Web Function and a Go `provided.al2023` Event Function, without an always-on container fleet. Regional services remain ap-southeast-2; the existing CloudFront certificate in us-east-1 is the global-service exception.

Previous immutable web revisions and artifacts are retained for rollback. The legacy NestJS API and preview require IAM; the old static Studio distribution and default HTTP API endpoint are disabled. Stored content, queues, buckets and Cognito identities are preserved. See [operations](operations.md) and [release and rollback](unified-app-migration.md).
