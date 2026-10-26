# Common application implementation and release boundary

## Implemented locally

One Next.js runtime now serves portfolio pages, published blogs, owner login, blog CRUD and the TechCanvas studio. Blog routes call the in-process DynamoDB repository; the old HTTP proxy and Supabase fallback are removed. The table keys, slug lookups, conditional version writes and index format match the existing NestJS repository. Public reads recheck current publication status. The shared owner session retains the previous signed payload/cookie format when the existing session secret is supplied.

Studio routes use the same configured owner login. A server-controlled TECHCANVAS_OWNER_SUBJECT maps that authenticated owner to existing studio records; browser input cannot select another owner. Existing cloud jobs and private S3 asset previews can be read when configured. Cloud create/retry remains disabled regardless of model environment flags. No Cognito configuration was changed; it continues protecting the old deployed studio until cutover. Removing the separate studio MFA challenge changes the authentication experience and must be explicitly reviewed before production promotion; the previous Cognito boundary is not silently claimed to exist in the common app.

Local demonstration mode is explicit, loopback-only and unavailable under Lambda runtime variables. It uses curated SVGs and private, single-process local file storage. It preserves stable-key replay/conflict handling and supports direct pack-to-blog-draft creation. It is not a distributed queue or paid inference substitute. Real text/image generation is a separate disabled integration; the new Go worker is still not deployed.

The old standalone Ollama experimentation/tooling remains in apps/techcanvas for reference; it is not automatically invoked from web requests. Long-running production generation belongs to Go through the existing queue, rather than an untracked task inside Next.js. S3 upload, hosted generation and retries remain paused.

## Reviewed release still required

Do not upload the common artifact through the previous code-only promotion path: the old frontend revision only has a backend URL, not the credentials and scoped permissions needed for native server routes. scripts/release-plan.mjs deliberately reports blockedForProduction with no release operations.

1. Refresh AWS authentication and inspect current stacks/settings without changing them. Keep the existing stack/resource identities and stateful resources.
2. Prepare an opt-in infrastructure change for the existing portfolio runtime: reuse the NoEcho owner email/hash/session-secret parameters, BLOG_TABLE_NAME and the existing scoped table grant. Remove dependence on PORTFOLIO_API_URL for the new revision.
3. Supply the exact existing TECHCANVAS_TABLE_NAME, TECHCANVAS_ASSETS_BUCKET and TECHCANVAS_OWNER_SUBJECT server-side. Review narrowly scoped jobs/table reads and private owner-prefix S3 reads. The common app only reads cloud jobs while inference is paused. No Bedrock grants, queue trigger activation or cross-region resources are needed for this consolidation.
4. Review shared login security. The existing portfolio PBKDF2 session replaces the separate studio Cognito/MFA challenge in this implementation. Decide on a common MFA-capable owner login before production exposure; preserve the existing studio until that decision is approved.
5. Stage an approved common revision; test the existing published article, owner cookies, private draft isolation, cloud job ownership, expiring asset links and a reversible temporary draft. The local integration tests do not prove live IAM access or login equivalence.
6. Promote the tested common revision through the existing custom-domain revision parameter. Preserve previous revision IDs for rollback. Do not delete the NestJS endpoint, studio hosting, Cognito pool or other old resources during this cutover.
7. Retire unused endpoints/hosting in a later explicitly approved cleanup after observing the new revision. Recalculate costs; neither app consolidation nor quotas impose a hard ₹1,000 AWS bill cap.

## Validation commands

pnpm check; pnpm build; pnpm test:integration; pnpm test:browser; pnpm build:aws --target portfolio.

Browser integration starts one Next.js server with temporary data. No NestJS process, standalone studio server, AWS call or paid inference is needed. Infrastructure compatibility tests continue checking the currently deployed split stacks and disabled triggers. Passing them is not a claim that production is already consolidated.
