# TechCanvas AWS

The Sydney foundation is deployed. The cloud backend and owner frontend have been implemented and approved for release, with paid inference and both processing triggers still disabled. See [deployment status](deployment-status.md) for the live outcome and [backend details](../docs/cloud-backend.md) for guarantees and operating limits.

## Development and verification

Use Node 24 or newer. Root app development remains dependency-free; cloud dependencies are isolated here.

```sh
npm --prefix infra ci --ignore-scripts
npm run check
npm test
npm run infra:test
npm --prefix infra run test:browser
npm run infra:synth
npm run infra:inventory
```

The cloud suite covers atomic quotas and idempotency, ownership, uncertain outcomes, duplicate deliveries, byte limits and PKCE. The browser test uses isolated Chrome, real local generation and mocked cloud endpoints. An opt-in live DynamoDB contract check validates real transactions with temporary isolated keys and fake inference; read its prerequisites before running.

`infra/build` contains three bundled Lambda entries, including pinned AWS SDKs. It excludes models, SQLite, `.env` and runtime data. `infra/site-build` contains five frontend files with generated public configuration. Both folders and `cdk.out` are ignored.

## Approved release scope

The release updates existing functions and scoped resource grants, adds a browser security-header policy and two authenticated API routes, and publishes the frontend. There are 46 application-stack resources after this update, plus the existing CDK bootstrap. No stateful replacement is proposed. The configured owner is a deployment parameter, never a source-code default. Email and enrollment identifiers are kept outside tracked files.

All Regional resources remain in `ap-southeast-2`. CloudFront is global. Buckets are private, access uses OAC or short-lived signed URLs, Cognito requires TOTP and disables self-signup, and every API route requires JWT plus a custom scope. The worker has no Bedrock permission; changing an environment flag alone cannot enable inference.

Hard inference controls in code: five outstanding jobs, 20 daily and 300 monthly reserved attempts, two runs per job, a complete serialized prompt limit of 6,000 UTF-8 bytes and a 1,600-token output limit. Byte size is not an exact input-token count. The selected Nova Lite model does not support CountTokens; free compatibility checks confirmed this. SDK automatic retries are disabled. Paid quality testing still requires approval.

## Publication

Only after deployment approval, synthesize/review the stack, deploy with the correct OwnerSubject parameter, then package against the resulting outputs:

```sh
node infra/bin/package-site.mjs /absolute/path/to/cdk-outputs.json
node infra/bin/publish-site.mjs /absolute/path/to/cdk-outputs.json --publish
```

Packaging does not upload. Publishing writes only five allowlisted objects with private bucket defaults, explicit content types, encryption and no-store caching; it does not delete existing files. CloudFront caching is disabled for this small owner app, avoiding stale authentication configuration.

## Security exceptions and cleanup

Scoped security-check acknowledgements in the stack explain: no recursive access-log logging; no frontend geofencing; no CloudFront WAF association under this AWS experience; the default CloudFront certificate's fixed legacy minimum TLS policy; terminal DLQ behavior; DynamoDB stream discovery's wildcard; Cognito Plus not enabled; and CDK read/write grants' wildcard actions confined to known resources and generated owner prefixes. The default CloudFront hostname does not enforce a TLS 1.2 minimum; review an approved compatible custom-certificate solution before broader launch.

Buckets, table and user pool are retained; both stacks have termination protection. Retained resources can continue to cost money. Review and inventory before deletion, especially queues and existing user/job data. The cleanup performed after the earlier failed attempts was limited to verified-empty resources from those attempts.

The illustrative future workload estimate is around ₹282/month, below the ₹1,000 target. It assumes traffic, token use, exchange rate and tax; it is not a billing cap. No paid plan upgrade, recurring monitor, billing alarm, marketplace subscription or advanced feature is enabled. Current objects and job/idempotency data need operator retention review.
