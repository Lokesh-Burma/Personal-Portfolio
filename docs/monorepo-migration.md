# Monorepo migration · 2026-10-26

Canonical repository: Lokesh-Burma/Personal-Portfolio.

| Original repository | Imported commit | Current path |
| --- | --- | --- |
| Personal-Portfolio | a9c6a95f9aeec452f6ebb22b904260c8fb7c6f6f | apps/portfolio; infrastructure/docs remain at root |
| Personal-Portfolio-API | bc65a9fb1c566b12e7acb86345a6ccb3047a8f26 | apps/api |
| Tech-Canvas-AI | e1100b003d842dc092472ad16fd6f68fb80bfe3c | apps/techcanvas |

The portfolio move is a normal rename commit. Other histories were imported using git subtree add without --squash. Source commits remain reachable; no force push or rewritten source history is required. A local backup/pre-monorepo-20261026 ref retains the original portfolio tip.

This is one Git repository with isolated app dependency installations, not a forced shared-lockfile migration. Original pnpm/npm lockfiles remain alongside their apps/infra. Root scripts provide a common interface and deterministic release ordering. Directory-based Docker build contexts keep Next.js standalone tracing and API production dependency packaging isolated.

AWS construct IDs and stack names have not moved within their construct trees. The TechCanvas stack's files moved together, preserving its relative runtime/content imports and asset packaging. No AWS deployment, IAM changes, DNS cutover, blog migration or paid inference activation is needed for the repository consolidation.

Local portfolio environment/private editorial files moved with their app and remain ignored. The original API/TechCanvas working directories and GitHub repositories are retained. Their generated dependencies/data are not imported or deleted. Existing local review servers should be restarted with the new apps/portfolio/content/drafts path if needed.

For future source changes, work only in this canonical repository. Old repositories can receive a relocation notice; archiving/deleting them is a separate decision. Monorepo consolidation does not merge the studio Cognito login with portfolio owner authentication or collapse separately deployed services.

Validation completed: locked installs; 77 tests including three new root-tooling checks; API lint/build; Next.js production build; TechCanvas handler build; both infrastructure syntheses; cross-app browser workflow; clean Linux ARM64 packages for both server apps. The TechCanvas template retains all 46 logical resource IDs/types. No live AWS deployment was performed.
