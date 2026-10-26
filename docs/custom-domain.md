# Custom domain connection

Requested on 2026-10-25: serve the AWS portfolio on lokeshburma.com, redirect www to the apex and skip migrating the sample blog posts. Vercel remains the authoritative DNS provider; no Route 53 hosted zone or domain transfer is required.

The non-exportable ACM public certificate covers lokeshburma.com and www.lokeshburma.com. CloudFront requires its certificate in us-east-1; both app servers, their data and regional logs remain in Sydney. Certificate issuance uses the user's Vercel CNAME validation records and an additional CAA authorization for amazon.com. Keep those records for renewal.

The LokeshPortfolioDomain stack adds a CloudFront distribution and an IAM-authenticated Sydney web endpoint on the existing portfolio function. Origin access control signs each request with the Web Function-specific always-amz-auth behavior. The resource policy permits only the distribution to invoke that endpoint. The separate backend remains protected by its owner cookie and origin checks.

Default behavior disables caching, forwards cookies/query parameters and excludes the viewer Host header. Only hashed /_next/static assets use optimized caching. Error responses are not cached. Browser response headers include CSP, HSTS, frame protection and MIME sniffing protection. A CloudFront Function redirects www to the canonical apex and preserves path/query. No Lambda@Edge, WAF, Shield Advanced subscription, paid AI, new databases or always-on servers are created.

Access logs omit cookies, use a private encrypted Sydney S3 bucket, expire after seven days and are retained on stack deletion. The legacy logging destination permits private ACLs because CloudFront requires them; public access remains blocked. Edge traffic, requests and the small redirect function are usage billed and draw from the existing planning allowance; the INR1,000 target is still traffic-dependent.

Deployment sequence:

1. Add certificate-validation CNAMEs and Amazon CAA permission without changing website routing.
2. Bind SITE_ORIGIN and backend CORS_ORIGIN to https://lokeshburma.com, preserving secrets. This creates immutable revisions; read the resulting verified frontend revision ID.
3. Deploy the domain stack using that explicit PortfolioRevisionId and the issued CertificateArn. Explicit revision parameters avoid immutable CloudFormation cross-stack export locks. Future app releases must update this parameter as well as the preview endpoint.
4. Verify the CloudFront hostname and signed origin, then test the canonical domain with a local connection override before DNS cutover.
5. At Vercel replace only conflicting website records with apex ALIAS and www CNAME pointing to the deployed distribution hostname. Preserve validation, email, TXT, CAA and NS records; do not change nameservers.
6. Verify public TLS, HTTP redirect, www redirect, static assets, owner login/logout, draft privacy and the studio link. Leave the old Vercel deployment available for rollback.

Rollback: restore the former apex/www website records in Vercel. If temporarily reverting to the native AWS preview URL, restore the preview SiteOrigin and update the domain revision parameter consistently. Do not delete data, certificate-validation records or the old deployment during cutover.

Sources:
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-lambda-web.html
- https://docs.aws.amazon.com/acm/latest/userguide/troubleshooting-caa.html
- https://vercel.com/docs/domains/working-with-dns

## Deployment status

CloudFront distribution E46ZR7FM0AGS1 is deployed at d9axko35mbymg.cloudfront.net. The certificate is issued, the protected origin rejects unsigned requests with HTTP 403, and Chrome verified the custom domain using a local DNS override before public cutover. Owner login, secure cookies, import/save, draft isolation and logout passed. The temporary draft was deleted. The user completed both Vercel website record edits. Public DNS verification passed without overrides: apex serves AWS, HTTP redirects to HTTPS, www redirects with path/query intact, owner login and draft privacy work, anonymous admin reads return 401 and cross-site writes return 403. A repeated hashed JavaScript asset request returned a CloudFront cache hit. No sample blogs were migrated.

The final public-domain browser check is reproducible with `node scripts/check-custom-domain.mjs --allow-test-writes`. It uses the private local owner configuration, creates/deletes one temporary draft and saves its report under .aws-build. The flag is an explicit opt-in to those test writes. No production sample posts are copied.
