# Portfolio platform preview

Preview deployment approved on 2026-10-25. The private data stack has been created; the runtime preview stack is deployed and verified. Custom-domain cutover was separately authorized and completed; the user declined sample-post migration.

Two Sydney stacks retain a private DynamoDB blog table, PITR, a versioned private build bucket and its access-log bucket. The preview stack runs Next.js and NestJS as two Node 24 Lambda Web Functions with seven-day logs. Only the API role receives table access. Both endpoints allow application authentication, with at most two environments each and the minimum supported nonzero endpoint throttle (100 requests/second). These settings are not a spending cap.

Run `npm ci`, `npm test`, then `npm run synth`. Native cdk-nag checks run during synthesis. The bundled CloudFormation validator lacks the new Web Function resource types; only its unknown-type diagnostics are acknowledged at those resources. Live service schemas/documentation informed their definitions. This is not proof of deployability; AWS predeployment validation remains required. IAM Policy Autopilot was run against the actual DynamoDB repository; its broad baseline was not applied. Review the actual resource-scoped grants in the synthesized templates.

Before any deployment:

1. Preview resources, package uploads and deployment were approved on 2026-10-25. Migration and DNS cutover still need separate approval after preview validation.
2. Build both artifacts on Linux ARM64 using each repository's `aws/Dockerfile.build`. Local macOS frontend packages are explicitly preview-only; Docker CLI and Colima are now installed. Both Node 24 Linux ARM64 artifacts have passed startup and basic HTTP smoke checks. Preserve internal dependency symlinks in both packages when creating its ZIP. Smoke-test both Linux artifacts before upload.
3. Review owner credentials privately. NoEcho hides parameter display; it is not a secret vault. Credentials are API-only environment variables. Never put values in source, shell history, logs or frontend builds.
4. Upload reviewed ZIPs only after approval. Supply exact S3 version IDs, owner parameters and an exact SiteOrigin. First deploy using the existing domain, then update SiteOrigin to the returned frontend preview HTTPS origin before testing owner writes. Do not perform owner writes during that intermediate origin mismatch.
5. Test native preview URLs, authentication, cookies, published visibility, draft isolation, throttling and real memory/environment lifetime. Re-estimate costs from measurements before considering production.
6. Export existing posts through the owner backup UI. Run the API migration script offline first. Applying requires separate approval; it preserves identities/timestamps and refuses conflicting records. Review/migrate external cover assets before claiming all-AWS hosting.
7. Prepare a CloudFront front door and verify ACM certificate eligibility for the custom domain. They are not part of this preview stack. Vercel DNS can remain authoritative. Preserve email records and the Vercel rollback deployment. DNS cutover needs approval after preview validation.

Immutable revisions and data are retained intentionally. Review old revisions/artifact versions during maintenance to prevent accumulation. Paid inference and the existing TechCanvas stack are untouched.

Both stacks have termination protection enabled. Live preview verification is recorded in ../docs/aws-preview-verification.json. The initial origin-binding update retained its previous immutable revisions intentionally. Existing sample posts remain at the former provider; the custom domain now serves AWS, with Vercel still providing DNS. Keep the approved preview origin parameter on future updates; do not reset it to the custom-domain default until cutover.

## Custom domain

The authorized LokeshPortfolioDomain stack is deployed separately with CloudFront, signed origin access and the issued ACM certificate. See ../docs/custom-domain.md. PortfolioRevisionId must track the desired app revision; never silently use an old revision when deploying a new app release. Sample-post migration was explicitly declined.
