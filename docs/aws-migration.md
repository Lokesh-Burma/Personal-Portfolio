# Optional AWS blog storage

The default remains PostgreSQL. Set BLOG_STORAGE=dynamodb and BLOG_TABLE_NAME only for an approved AWS environment; the adapter is restricted to Sydney. The companion portfolio must set server-only PORTFOLIO_API_URL to this API's reviewed HTTPS endpoint. CORS_ORIGIN must match the exact frontend origin.

Install with pnpm install --frozen-lockfile. Existing Docker Compose PostgreSQL development remains supported. Run pnpm build, pnpm test --runInBand, pnpm test:e2e --runInBand and pnpm lint.

For migration, use the portfolio owner's Export posts backup button. Keep that export private because it contains drafts. Run node scripts/migrate-blogs.mjs /private/posts-export.json for offline validation. No AWS request occurs unless --apply is passed. Applying requires explicit migration approval, reviewed table credentials and BLOG_TABLE_NAME; conflicting existing records are rejected rather than overwritten. Export IDs, timestamps and publication states are preserved. External cover URLs require review and migration before all-AWS cutover. The source database is never deleted by this script.

Build Linux ARM64 artifacts with aws/Dockerfile.build. Docker CLI and Colima were installed after preview approval. The packaged Node 24 Linux ARM64 API passed startup, health and anonymous-admin rejection checks without AWS credentials. The package script isolates its production dependency installation outside the pnpm workspace, preserves internal relative symlinks and rejects escaping links. Keep those links when zipping. Runtime reads AWS_LAMBDA_HTTP_ENDPOINT for the HTTP listener. Swagger is disabled in production unless explicitly enabled.

Infrastructure and cost scenarios live in the companion Personal-Portfolio repository. The AWS preview and custom-domain cutover were approved and completed on 2026-10-25. The portfolio now runs at https://lokeshburma.com and uses this API server-side. The user declined migration of the sample blogs. Paid inference remains disabled.
