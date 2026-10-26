# Cloud backend release

Implemented and released against the deployed Sydney foundation. Check `../infra/deployment-status.md` for the live deployment outcome. Paid inference remains disabled and there are no Bedrock permissions in the release template.

## Behavior

- Every API route requires an access-token JWT, the `techcanvas/access` scope and the exact configured owner sub. API query keys are derived from that owner; callers cannot choose a partition.
- Job creation atomically writes the job, durable idempotency record, outbox record and one of five queue slots. Reusing a key with different input returns 409. Idempotency records do not expire silently.
- Only owner outbox INSERT stream events are eligible for dispatch. Dispatch reads current state, sends to one FIFO group with a stable deduplication ID, then marks delivery. Repeated delivery is safe even after SQS's deduplication window because the worker compares job state and revision.
- The worker atomically reserves global counters for the current UTC day and month while moving the job from queued to running. Hard limits are 20 daily and 300 monthly reserved attempts. Counts are never refunded for timeouts, failures, lost responses or an interrupted worker. An explicit retry reserves another attempt. Each job permits at most two runs, including failures before invocation.
- A running attempt has a three-minute lease. Redelivery during that lease fails for later delivery; after it expires, an interrupted attempt is marked failed without another model call. This deliberately favors avoiding duplicate charges over automatically recovering an uncertain generation.
- Nova Lite direct invocation stays in Sydney, with SDK `maxAttempts: 1`, an 80-second request deadline and an explicit 1,600-token output limit. Strict JSON validation rejects incomplete, oversized, unexpected or unsafe output before rendering eight Markdown/text/JSON/SVG files. References come from reviewed local notes, not model-generated links.
- Complete prompts (system text and messages serialized as JSON) are limited to **6,000 UTF-8 bytes** before reservation and again before invoking the SDK. This is not an exact model-token limit: live free checks confirmed CountTokens is unsupported by Nova Lite and the sampled Sydney alternatives. No cross-region workaround is used. The budget calculator's 6,000 billed input tokens is an assumption, not a measured maximum.
- Artifacts remain private under owner/job/revision prefixes. Only a completed, owned job gets five-minute signed download URLs. An incomplete attempt can leave unreferenced private objects; no client can list the bucket or access them through the API. Storage cleanup remains an operator task.
- The browser uses authorization-code PKCE and a short-lived access token held only in memory. Only PKCE verifier/state are temporarily stored in sessionStorage. Refresh tokens remain in memory for revocation at logout; reload or expiry requires signing in again. The hosted login session can make that return quick. Required MFA is configured in Cognito.

## Tests and build

```sh
npm test
npm run check
npm run infra:test
npm --prefix infra run test:browser
npm run infra:synth
node infra/bin/package-site.mjs /absolute/path/to/cdk-outputs.json
```

The Chrome test uses an isolated context, real local pack creation and PNG downloads, then mocks cloud authentication, API and S3 responses to exercise the complete browser path. It does not prove live MFA or paid-model quality.

An additional opt-in integration check (`npm --prefix infra run test:contract`, with `TECHCANVAS_CONTRACT_TABLE`, `AWS_PROFILE=aws-toolkit` and `AWS_REGION=ap-southeast-2`) passed against the existing table. It uses unique TEST partitions, verifies idempotency, owner isolation and concurrent daily/monthly boundaries, and removes only its own records in `finally`. It uses fake inference and never touches production quota keys.

The deployment asset is built by esbuild from the three runtime entries, with pinned SDK dependencies. Root SQLite, models, `.env` and local data are not packaged. The shared content renderer is pure code used by both local and cloud modes. `infra/build` and `infra/site-build` are ignored generated directories.

## IAM review

IAM Policy Autopilot was run on all actual SDK source files with JavaScript explicitly selected for `.mjs`. The reproducible command is:

```sh
TECHCANVAS_PROJECT_ID=$(aws sts get-caller-identity --profile aws-toolkit --query Account --output text)
DISABLE_IAM_POLICY_AUTOPILOT_TELEMETRY=true uvx iam-policy-autopilot@latest generate-policies \
  "$PWD/infra/runtime/repository.mjs" "$PWD/infra/runtime/aws-assets.mjs" \
  "$PWD/infra/runtime/aws-queue.mjs" "$PWD/infra/runtime/aws-provider.mjs" \
  --language javascript --region ap-southeast-2 --account "$TECHCANVAS_PROJECT_ID" \
  --service-hints dynamodb s3 sqs bedrock --pretty
```

The generator's baseline includes wildcard resources and conditional features not used here (such as KMS, ACLs and bearer-token inference). It is an audit input, not a deployable policy. No generated managed policy was uploaded. The CDK release uses resource grants for the existing table and private object prefix: table read/write grants to backend functions, generated-object reads to the API, generated-object writes to the worker and queue send to the dispatcher. CDK grants include some broader SDK actions within those resources; scoped security-check acknowledgements document them. No Bedrock grant is applied, and both event sources remain disabled.

## Activation and recovery

Publishing this release is separate from enabling inference. The deployment updates the existing functions and routes, adds a browser security-header policy and two authenticated routes, and sets backend readiness true. It does not replace storage, enroll an owner or enable generation by itself. The signed-in browser shows that cloud AI awaits activation.

Owner enrollment and its email invitation were explicitly approved for this release. Keep the email and resulting owner sub outside tracked configuration. Update the `OwnerSubject` CloudFormation parameter only after identifying that user. Users complete password setup and TOTP in Cognito's hosted flow; that human step cannot be tested with mocked tokens.

Before paid activation: separately approve narrowly scoped Bedrock permissions, enable both mappings in a reviewed change, conduct a small approved quality/usage test, and verify live authorization with the real owner. A running worker must retain a single FIFO group and the transactional reservations; changing SDK retry settings or bypassing the provider changes the cost guarantees.

If dispatch fails beyond stream retries or its 24-hour retention, pending outbox records remain durable. An operator must query the owner's OUTBOX prefix and replay pending entries through the same `dispatch` method; never create a new job or reset counters to repair delivery. SQS and stream DLQs require operator review. If work is stuck running, redelivery or the same `work` path after lease expiry marks it failed without new inference. A job stranded before delivery can occupy a queue slot until repaired. Automatic reconciliation is not included in this MVP.

The budget is a workload estimate. Attempt caps do not cap API, authentication, storage or delivery charges. Current objects, job metadata and idempotency records have no automatic expiry; their growth needs review. No spending alarm, recurring monitor, public signup, marketplace subscription, paid plan upgrade or advanced feature is enabled here.
