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

The shared interface uses Indigo with Light, Dark and System modes in the navigation. System is the default; explicit choices are stored locally and applied before first paint. Tool icons and status colors adapt to both themes. Theme selection changes presentation only and does not affect authentication or saved content.

TechCanvas includes a searchable concept library, review markers, image version comparison, usage-based image-cost estimates, and local PNG/social/poster exports. Print / save PDF opens a printable learning sheet. Exports reuse saved assets and never call a model. Image refinement creates a separate child pack and requires explicit activation; production processing remains paused.
