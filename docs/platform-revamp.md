# Unified portfolio implementation

The portfolio now shares TechCanvas's dark canvas, lavender accents, typography and component style. Home, projects, writing, career, contact and owner tools retain their existing content. TechCanvas has a shared navigation entry and a dedicated introduction; its studio keeps its existing owner authentication.

The optional server-only PORTFOLIO_API_URL connects Next.js routes and server rendering to the standalone Nest API. Only the owner session cookie crosses this bridge; upstream URLs are fixed, redirects are rejected, writes require a matching origin, request bodies are bounded and API failures do not disclose internal errors. Without this setting the existing Supabase path remains active for rollback. Public pages read only published posts.

The Nest API has an optional DynamoDB adapter and preserves its PostgreSQL adapter. Conditional transactions protect slug uniqueness, updates and migration conflicts. The owner can export a backup and import TechCanvas exports as unsaved drafts; publication remains an explicit action. Studio single sign-on and one-click cross-app publishing are future work.

Local validation: portfolio production build and eight tests; API build, lint, seven unit tests and six HTTP tests; five infrastructure tests and strict CDK synthesis with cdk-nag. A Chrome workflow exercised desktop, 390px and 320px layouts, actual Next-to-Nest owner login/logout, API-backed posts, a real TechCanvas export import/save, and draft privacy. That workflow used an in-memory database fixture, not production data. Both apps now have verified Linux ARM64 packages and passed packaged startup/HTTP smoke checks. The live Sydney preview passed owner login/logout, secure cookie checks, TechCanvas import into DynamoDB, draft isolation, conditional slug rename and deletion of the test record. See aws-preview-verification.json.

## Cost assumptions

Run `python3 scripts/estimate-platform-costs.py`. Public Sydney ARM Web Function prices are saved in platform-pricing-snapshot.json. Scenarios assume two services, 20,000 total monthly requests, 50ms active CPU/request, conservatively 2GB billed memory per active environment-hour, INR100/USD and assumed 18% tax. Actual billed memory and environment lifetime must be measured. The existing rounded TechCanvas allowance is USD2.39; inference is currently disabled. An additional USD1 planning allowance covers small database/storage/log/traffic variation; this is not a comprehensive itemized vendor quote. Large downloads, sustained traffic, CI builds and retention growth need a new estimate. No free tier or credits are subtracted.

Bursty use at 30 total environment-hours per service is approximately INR593/month combined; 150 hours approaches/exceeds the target, and continuous warm usage substantially exceeds it. The INR1,000 target is therefore conditional, not guaranteed. Endpoint concurrency limits do not cap the bill. Preview measurements are required before production approval.

The user approved the AWS preview on 2026-10-25. The private data stack has been created; both runtime endpoints are deployed and verified. No domain records or production data were changed. See ../infra/README.md for the staged deployment gates. Existing TechCanvas hosting remains unchanged.

## Verified preview

Portfolio: https://p98xcj070mlrbjfz.44l.lambda-web.ap-southeast-2.on.aws

API: https://shzm4p4hvmt59m7s.44l.lambda-web.ap-southeast-2.on.aws

Use the existing portfolio email/password at /admin. TechCanvas retains its existing separate studio login. The preview blog store starts empty; existing production posts have not been migrated. Native CloudWatch samples initially reported peak environment memory of 195 MB (frontend) and 221 MB (API). These short samples do not establish billed monthly memory or future environment lifetime. No paid custom monitoring was enabled.

Docker CLI, Buildx and Colima are installed. The isolated Colima profile is techcanvas (4 CPUs, 6 GB RAM, sparse 40 GB disk). A pre-existing Docker Desktop credential helper was unavailable, so builds used an isolated Docker configuration in /tmp/techcanvas-docker-config and DOCKER_HOST pointing to the Colima socket. Both Linux ZIPs preserve relative internal pnpm symlinks; flattening those links breaks Next.js dependency resolution. The Next.js-compatible TypeScript compiler is pinned to 5.9.3.

After successful deployment, the local smoke-test containers and Colima VM were stopped to release Mac memory. Restart with `colima start --profile techcanvas`. AWS hosting runs independently of this Mac.

Custom-domain setup was authorized on 2026-10-25. Both the apex and www are verified publicly: apex serves AWS and www redirects to the apex. The user explicitly declined migrating the sample posts. SITE_ORIGIN and API CORS_ORIGIN now use https://lokeshburma.com, so owner writes should use that canonical hostname. See custom-domain.md.
