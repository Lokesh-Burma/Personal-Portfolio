# Shared TechCanvas infrastructure

This stack retains existing owner identity, job data, private assets and queue identities. Required TOTP MFA remains enabled. Committed contexts select the Go worker and canonical common-app callback; retireLegacyStudio disables the old distribution/default HTTP API without deleting data. Both processing mappings and paid inference remain disabled.

Use npm ci, npm test and npm run synth after building the Go artifact (or root pnpm infra:synth). Legacy site packaging remains for coordinated rollback only. Inventory inspects local templates; live contract tests require explicit test-write approval. See ../../../docs/unified-app-migration.md.
