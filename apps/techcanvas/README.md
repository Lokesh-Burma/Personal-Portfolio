# Current production studio compatibility

public/ contains the currently deployed static studio. infra/ contains its existing stack, Node event handlers, build/publish tools and safety tests. They remain necessary until the combined Next.js studio is deployed and the old endpoints are explicitly retired.

The standalone local Ollama/SQLite prototype was removed. Use pnpm dev from the root for the common application. Canonical rendering and job modules are in ../portfolio/lib/studio; infrastructure entrypoints preserve compatibility without a second implementation.

No deployment or model activation is implied by local builds. See ../../docs/architecture.md and ../../docs/operations.md.
