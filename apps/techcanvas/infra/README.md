# TechCanvas infrastructure

AWS CDK definitions for shared Cognito MFA, job storage, private assets, queues, dispatcher and Go worker. Existing resource identities and stored data are preserved.

The committed configuration selects the Go worker and common-app login callback. Legacy static hosting and the default HTTP API endpoint are disabled. Both processing triggers and paid inference remain disabled.

## Validate

Run from the repository root:

```sh
pnpm infra:synth
```

For infrastructure tests only, run from this directory:

```sh
npm ci
npm test
```

Root synthesis builds the required worker artifact and handlers. It does not deploy. See [release and rollback](../../../docs/unified-app-migration.md) before applying changes.
