# Existing TechCanvas infrastructure

The stack preserves the current owner pool/client, static frontend, API, private assets, jobs/quota/outbox table and event consumers. Required TOTP MFA remains enabled. Paid inference and both processing triggers remain disabled.

Use npm ci, npm test and npm run synth. package-site.mjs/publish-site.mjs maintain the still-deployed static frontend. inventory.mjs inspects a local synthesized template only. The opt-in live storage contract test is not a default local check.

commonAppOrigin adds the common application's exact Cognito callback/logout targets and email scope without replacing the existing pool/client. goWorker selects the approved Go artifact without activating inference or processing. Neither option deploys anything by itself.

See ../../../docs/shared-owner-mfa.md and ../../../docs/unified-app-migration.md before a reviewed release. Preserve resource identities and current settings; do not use partial client-update commands.
