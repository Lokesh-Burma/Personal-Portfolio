# Proposed AWS budget — no deployment performed

Planning date: 25 October 2026. Target: approximately ₹1,000/month for a low-traffic, single-user service. No AWS services or budget alerts were enabled. This is a proposed design, not a guaranteed bill or an approved deployment.

## Smallest practical proposal

| Item | Planning allowance |
| --- | ---: |
| Lightsail Linux, 1 GB RAM, public IPv4 | $7/month; about ₹744 at an assumed ₹90/USD and assumed 18% tax |
| Private S3: a small image library, light requests/transfer | ₹50/month planning reserve; verify Mumbai region calculator |
| Small backups / monitoring reserve | ₹100/month planning reserve; confirm retention before enabling |
| Headroom | about ₹106/month |
| Total envelope | approximately ₹1,000/month under these assumptions |

The exchange rate and tax are **illustrative assumptions**, not verified current financial/tax advice. At ₹100/USD the same compute arithmetic becomes ₹826, leaving less headroom. Recalculate actual regional pricing, exchange rate, tax and usage in the AWS calculator before approval.

AWS currently lists a public-IPv4 Linux 1 GB / 40 GB SSD plan at $7/month and an IPv6-only 1 GB plan at $5/month. Prefer the IPv4 option for straightforward access, subject to final regional verification. Some regions have smaller included transfer allowances. Source: [Lightsail official pricing](https://aws.amazon.com/lightsail/pricing/), checked 25 October 2026. [S3 official pricing](https://aws.amazon.com/s3/pricing/) varies by region, storage, requests and transfer; the ₹50 amount is a reserve, not a quoted S3 rate.

Keep one app server and SQLite. Avoid RDS, NAT Gateway, ALB, EKS and always-on model inference infrastructure in this budget. Domain registration, unusually high traffic, large backups and paid AI generation require separate approval/budget.

## AI budget boundary

A 1 GB Lightsail machine is intended to serve the app, not run a useful general-purpose LLM or image model. Local Ollama uses the developer machine and is not reachable from a future cloud server by default. A production AI provider or an explicitly designed local generation/import flow is still a separate decision. The approximately ₹1,000 hosting envelope does **not** promise unlimited hosted AI inference.

## Before any approved deployment

Prepare a final calculator estimate and resource list; add authenticated HTTPS access; choose private S3 retention and backup frequency; use least-privilege credentials and set expected-usage limits. Request approval for enabling the specific resources and any paid AI provider. Set budget notifications only after approval. AWS budget notifications are alerts, not hard billing caps. Never assume free-tier credits to meet the recurring budget.
