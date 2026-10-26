# AWS deployment status — 25 October 2026

The cloud backend and owner frontend are published in **Sydney (`ap-southeast-2`)**. CloudFormation reports **UPDATE_COMPLETE**, with 46 application resources and termination protection enabled. CloudFront is deployed. The user explicitly approved this release, its scoped runtime permissions, owner creation and email invitation.

App: https://d3ezvecjyqm5h9.cloudfront.net

Cognito accepted the invitation request. The initial owner status is FORCE_CHANGE_PASSWORD; the owner completes password setup and TOTP in the hosted flow. The email and owner identity are outside tracked source. The configured owner sub is a deployment parameter.

## Verified live behavior

- All three S3 buckets block public access.
- Both processing event-source mappings are Disabled.
- All functions have backend readiness enabled and Bedrock approval disabled; the deployed template contains no Bedrock permission.
- Direct Lambda owner-harness requests return 200 for configuration and the empty library, and 503 for creation while inference is disabled.
- Anonymous API GET and POST requests return 401. Browser preflight allows the exact frontend origin.
- The HTTPS frontend and cloud configuration are published and match stack outputs. CSP, MIME-sniffing protection, frame denial and no-referrer headers are served.

Verified at 2026-10-25T11:12:21.676962+00:00. The sanitized [verification report](deployment-verification.json) records details. A live isolated Chrome check also reached the published app and visible Cognito sign-in form without entering credentials. The owner must complete the real password/TOTP sign-in; that human step is not an automated test result.

## Validation and operating limits

17 local tests, 26 cloud/infrastructure/auth tests, two isolated Chrome workflows, a bundled-handler load check and a real DynamoDB concurrency/idempotency contract passed. Contract records used isolated TEST partitions and were removed. Cloud browser workflow tests mock tokens and model output; no paid generation was tested.

Quota reservations enforce 20/day and 300/month, with at most two runs per job. The complete serialized prompt limit is 6000 UTF-8 bytes; the requested output limit is 1600 tokens. Free compatibility checks confirmed Nova Lite and sampled direct Sydney alternatives do not support CountTokens. Byte size is not an exact token ceiling. Interrupted/uncertain attempts are not refunded or automatically repeated. See [backend operating details](../docs/cloud-backend.md).

Paid inference remains disabled. No public signup, paid plan upgrade, marketplace subscription, advanced feature, spending alarm or recurring monitor was enabled. The future workload estimate is about INR 282/month at its documented exchange-rate, tax, traffic and token assumptions; it is not a billing ceiling.

## Deployment history

CDK bootstrap was created in Sydney with artifact storage, an empty ECR repository, an SSM version parameter and standard deployment roles. Its CloudFormation execution role has AdministratorAccess; no external projects are trusted. Review narrowing that role before CI integration.

Two initial creation attempts exposed AWS-side requirements that local validation had not caught: Lambda reservations cannot fit this project's total concurrency of 10 with the required 10 unreserved; API Gateway also required an explicit API name. Both were corrected and covered by regression checks. Each failed attempt rolled back; only its verified-empty buckets, table and user pool were removed before retry. No user data was deleted.

The foundation then reached CREATE_COMPLETE with 43 resources. This approved backend/frontend update added a browser response-header policy and two authenticated routes, updated functions and resource grants, and published five frontend files. Existing storage and Cognito were updated in place. No duplicate retained resources from the failed attempts remain.

## Cleanup

Both stacks use termination protection. Buckets, DynamoDB and Cognito are retained on stack deletion and can continue to cost money. Bootstrap artifacts also remain. Inventory and review resources before cleanup; retained data and queues need separate consideration. Current objects, job metadata and idempotency records require operator retention review. Never reset quota counters to recover queued work.
