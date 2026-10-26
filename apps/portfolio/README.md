# Common web application

The production Next.js app serves the portfolio, blog, owner login and TechCanvas Studio. Native API routes handle blog storage and Studio access; one Cognito MFA session covers both private areas.

## Develop and check

Run from the repository root:

```sh
pnpm dev
pnpm check --target portfolio
pnpm build --target portfolio
```

Server settings are listed in [.env.example](.env.example). Local demo configuration is generated automatically and excluded from Git and builds. Studio modules live in `lib/studio`; published posts are stored in DynamoDB.

See [operations](../../docs/operations.md) for builds and [shared MFA](../../docs/shared-owner-mfa.md) for authentication.
