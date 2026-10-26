# Production studio compatibility

Follow the root AGENTS.md. This directory owns shared production infrastructure and retains the disabled legacy studio for rollback.

- AWS profile aws-toolkit, region ap-southeast-2, new AWS experience. Guidance preference HIGH is already established; do not ask again.
- No deployment, paid inference, processing-trigger activation, data deletion, plan upgrade or new paid service without approval. Budget target roughly ₹1,000/month, not a hard cap.
- Preserve existing pool/client/resource identities and required TOTP MFA. Keep only the canonical common-app callback in normal production; temporary staged callbacks require a reviewed change. No partial update-user-pool-client calls.
- No CloudFront WAF association, Lambda@Edge, cross-region regional services or advanced-feature activation to bypass experience restrictions.
- Canonical studio modules live in ../portfolio/lib/studio. Keep compatibility wrappers only where deployment entrypoints require them. Use the root common app for local development.
- Preserve ignored runtime data and private files. Local inventory/synthesis is not a live AWS verification.
