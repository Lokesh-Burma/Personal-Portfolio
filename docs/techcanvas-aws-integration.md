> Historical assessment. The newer implementation and DynamoDB preview plan are documented in [platform-revamp.md](platform-revamp.md). No deployment or cutover has occurred.

# Portfolio, AWS and TechCanvas integration

Assessed 25 October 2026. Current portfolio: https://lokeshburma.com, hosted on Vercel. Public DNS nameservers are ns1.vercel-dns.com and ns2.vercel-dns.com. This assessment and local integration do not change production hosting, DNS or blog data.

## Local integration implemented

- `/techcanvas` introduces the existing concept studio and links to its owner-only AWS workspace and the portfolio's blog editor. A navigation item exposes this page on desktop and mobile.
- The authenticated `/admin` editor accepts TechCanvas's existing `portfolio.json` export. It validates size and field types, opens a new draft rather than editing the previously selected post, forces unpublished draft status and leaves saving to the owner.
- Imported private cover links are discarded. Five-minute signed S3 URLs cannot be used as permanent public blog images. Publication needs a separately reviewed durable public asset URL.
- The import uses a local file and existing admin APIs; it does not share Cognito tokens, transfer the Supabase service key to a browser, automatically save, or automatically publish.
- Studio generation remains paused under the current AI-approval setting. This integration does not activate inference.

Validation: four importer tests, TypeScript checking and the Next.js production build passed. An isolated Chrome check uses the actual TechCanvas export format and mocked admin APIs to verify importing over a selected published post creates a new draft, does not write automatically, clears expiring cover links, saves via POST only after the owner clicks Save, and resets the new-post editor. It does not write to the live database.

Run locally with the repository's existing pnpm workflow. `npm run test:techcanvas` uses Node's built-in TypeScript stripping; use a compatible recent Node release (the current test runtime is Node 26). No new package dependency is required by the integration.

## Recommended AWS target

Keep Vercel as the DNS provider. Hosting and DNS are separate concerns, so no registrar or nameserver move is needed merely to host the website on AWS. Vercel supports ALIAS records at the apex and CNAME records for subdomains; concrete records must be generated from the validated AWS target before cutover.

Use a single-Region Node.js SSR runtime in Sydney for the portfolio. AWS Lambda Web Functions are the initial fit to validate because the app already produces a Next.js standalone Node server and needs SSR, API routes and signed admin cookies. Keep Supabase for the existing blog data in this migration; there is no need to introduce RDS or a database migration merely to change hosting.

The installed Next.js version is 16.2.9, with `output: standalone`. Blog pages use request headers and force-dynamic rendering. The app cannot be uploaded unchanged as a static S3 export. AWS's currently fetched Amplify support page documents native Next.js support through version 15, so an Amplify migration must not be assumed compatible with this installed version. Validate the standalone runtime, Linux build artifacts, listen-address bootstrap, streaming, cookies and environment variables on the chosen serverless target first. The generic Launch with AWS static-export workflow does not cover this app as-is.

Suggested URL layout after compatibility and certificate validation:

- `lokeshburma.com`: public portfolio and published blog.
- `lokeshburma.com/techcanvas`: public project overview and links into the owner workflow.
- `studio.lokeshburma.com`: owner-only TechCanvas workspace, if the custom certificate path is supported and approved.
- `lokeshburma.com/admin`: current review/publishing workflow; authentication remains separate initially.

CloudFront requires a matching custom-domain certificate. ACM certificates used by CloudFront must be in us-east-1, while this new-experience project restricts Regional resource creation to its selected Region. A read-only check found no existing certificate in us-east-1. This does not establish whether an approved service-managed certificate path is available; verify that before provisioning or promising a domain cutover. Do not activate advanced features, upgrade the plan or create out-of-Region resources to bypass the restriction.

## Release gates

1. Pin the actual Next.js/React versions used for the migration and validate a reproducible Linux-compatible standalone build. Review the Vercel Analytics integration for its AWS-hosted behavior.
2. Prepare and test the Sydney SSR infrastructure with the existing Supabase backend. Transfer server-only credentials through an approved secret/environment configuration without exposing them in Git, browser code or command output.
3. Verify custom TLS certificate eligibility and preserve current DNS records, including email and verification records. Recalculate a combined workload estimate for portfolio SSR plus TechCanvas; the earlier INR 282 estimate covers TechCanvas assumptions, not this new combined deployment.
4. Obtain approval for the concrete AWS resources and deployment. Test the preview before changing production DNS, including public pages, dynamic posts, admin login/logout, draft creation and cache/cookie behavior.
5. Obtain approval for DNS cutover. Keep the Vercel deployment available for rollback and verify TLS, redirects and all routes after propagation. No full-stack migration has been performed by this local integration.

Automatic “send to portfolio as draft” can be added after the shared hosting/auth boundary is decided. It needs authenticated server-to-server authorization, idempotency and a publication path for approved assets. Browser credentials or expiring private links must not become public blog content.

## Sources

- AWS Lambda Web Functions: https://docs.aws.amazon.com/lambda/latest/dg/web-functions.html
- Web Function runtimes and Next.js standalone listen-address handling: https://docs.aws.amazon.com/lambda/latest/dg/web-functions-runtimes.html
- Amplify Next.js support: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
- CloudFront TLS certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- New-experience project Regions: https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html
- Vercel DNS records: https://vercel.com/docs/domains/working-with-dns
