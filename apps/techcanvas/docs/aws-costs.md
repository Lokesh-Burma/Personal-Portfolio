# Proposed AWS budget — Sydney owner-only MVP

Revised 25 October 2026. **Infrastructure provisioning approved; see infra/deployment-status.md for the live outcome. No model invocation or plan upgrade is authorized by this infrastructure deployment.** This supersedes the earlier estimate that incorrectly included CloudFront/WAF for this new-experience project.

## Architecture being priced

CloudFront serves only the frontend from private S3/OAC. The browser calls the Sydney HTTP API directly with a Cognito access token. JWT protects routes; the foundation rejects all application operations. Owner-scoped persistence and transactional AI quotas still need implementation. There is no WAF association, CloudFront API origin, origin-secret bypass scheme, paid flat-rate plan or advanced-feature activation. Read the [deployment proposal](aws-deployment-plan.md) for what must be built and tested.

## Workload assumptions

- 300 billed AI attempts per UTC month, including retries and evaluation calls; proposed daily cap 20. Daily/monthly reservations are implemented and tested in the pending backend release; inference remains disabled.
- The runtime bounds the complete serialized prompt to 6,000 UTF-8 bytes and requests at most 1,600 output tokens. The estimate assumes 6,000 billed input tokens per attempt; this is a planning assumption, not an exact token limit. Nova Lite does not support CountTokens in Sydney.
- 10,000 HTTP API requests and 10,000 frontend CloudFront HTTPS requests monthly; these are separate traffic assumptions.
- One active owner, 2 GB S3 assets, 1 GB DynamoDB storage, 25,000 RRU and 10,000 WRU.
- Lambda worker: 512 MB for 60 seconds per attempt; API: 512 MB for 100 ms per request. Cloud duration remains unmeasured.
- One million FIFO queue operations, including empty polling, plus 0.1 GB log ingestion and 0.1 GB average retained logs.
- 2 GB CloudFront viewer transfer at Australia edge rates. Viewer geography can change delivery prices.
- No credits, promotions or free usage allowances are deducted. For a conservative comparison, the paid DynamoDB storage rate is applied to all estimated storage instead of subtracting its free allowance.

## Estimated monthly cost

| Component | USD/month |
| --- | ---: |
| Bedrock (6000 input + 1600 output tokens/attempt) | 0.23 |
| Lambda (512 MB worker, 60 s/attempt; 512 MB API, 100 ms/request) | 0.13 |
| HTTP API (10000 requests) | 0.01 |
| DynamoDB (1 GB, 25000 RRU, 10000 WRU) | 0.30 |
| DynamoDB PITR (1 GB protected) | 0.23 |
| S3 access logs and bootstrap artifacts (1 GB, 10000 PUT, 10000 GET) | 0.08 |
| SQS FIFO (1000000 operations incl. empty polling allowance) | 0.50 |
| S3 (2 GB, 5000 PUT/LIST, 10000 GET) | 0.08 |
| Cognito Essentials (1 active owner) | 0.02 |
| CloudFront (2 GB out, 10000 HTTPS requests; Australia viewer rates) | 0.24 |
| Logs (0.1 GB ingest, 0.1 GB average retained) | 0.07 |
| Planning reserve: backups, alarms, artifacts and geographic variation | 0.50 |
| **Total** | **2.39** |

At illustrative INR 100/USD and assumed 18% tax: **INR 282.23/month**, with INR 717.77 headroom. This is a workload estimate, not a billing ceiling. It includes future capped inference, which remains disabled. FX and tax are assumptions.

At INR 90/USD the estimate is INR 254.00; at INR 110/USD it is INR 310.45. No free allowances or credits are deducted.

## Protection and billing limits

This reduction comes from removing unsupported WAF, not from obtaining equivalent protection for free. JWT authorization and per-owner checks protect data and prevent anonymous model use; they do not provide WAF inspection or bot filtering. API throttles are best-effort targets and do not guarantee request ceilings. Rejected and abusive traffic can still incur API/delivery/authentication charges. CORS does not block direct non-browser requests.

The model quota limits inference attempts, not the complete AWS bill. Keep self-signup disabled, reject non-owner requests, configure conservative throttles and bounded polling, redact logs and set alerts only after approval. Review security and cost again before public signup or multi-user access. No hard INR 1,000 billing cap is claimed.

Continuous backup and additional S3 logging/artifact usage are priced explicitly above. The USD 0.50 reserve covers dispatcher overhead, limited direct S3 delivery and geographic variation. It is an allowance, not a vendor quote. Validate these choices and measured queue polling before release. No SMS, new domain, premium security service, NAT Gateway, managed database instance, paid model subscription, image-model calls or paid CI/CD service is included.

## Sources and eligibility

The [saved snapshot](aws-pricing-sydney.json) contains 17 public price records. Sydney Nova Lite standard on-demand rates are USD 0.000063 per 1,000 input tokens and USD 0.000252 per 1,000 output tokens. Availability was checked through the regional catalog; invocation permission, output quality and actual runtime still need a separately approved test.

- [Project Regions and CloudFront/WAF restriction](https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html)
- [Supported services for the new AWS experience](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html)
- [JWT authorization](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html)
- [Best-effort throttling](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-throttling.html)
- [CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/) and [flat-rate plan eligibility](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html)
- [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/) and [AWS Price List API](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/price-changes.html)

The Free flat-rate CloudFront bundle is not assumed and the project stays on its current Free plan. No existing credit balance is included in these tracked files. Actual eligibility, quotas and current prices must be checked again before any deployment.

## Recalculate offline

```sh
python3 scripts/estimate-aws-costs.py
python3 scripts/estimate-aws-costs.py --usd-inr 110 --tax-rate 0.18
python3 scripts/estimate-aws-costs.py --attempts 500 --json
```

This calculator reads the local snapshot only. It does not contact AWS or implement quotas.
