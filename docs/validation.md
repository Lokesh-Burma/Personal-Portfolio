# Validation record

25 October 2026, macOS, Node.js 26.4.0.

- `npm run check`: passed server, core and browser JavaScript syntax checks.
- `npm test`: 17 passed, 0 failed. HTTP integration tests use real ephemeral loopback listeners and temporary SQLite databases.
- Tests cover content generation, eight export assets, portfolio draft shape, idempotency replay/conflict, malformed/oversized input, same-origin and Host checks, failed-job retry, persistence/restart handling, queue limits, provider schema validation, SVG escaping and the S3 approval gate.
- Installed Ollama 0.32.5 and evaluated real local inference on Apple M1 / 8 GB RAM. The selected model is Qwen3 4B with a 4096-token context and thinking disabled. Three live end-to-end evaluations passed: database indexing (28.3 s), circuit breakers (23.8 s), consistent hashing (27.3 s); all eight assets were available for each pack.
- Reviewed draft content, rejected the earlier Llama 3.2 candidate for factual/domain errors, added short source-grounding notes and focused regression checks. These checks do not establish factual correctness for arbitrary topics.
- Runtime was confirmed as 100% GPU with approximately 2.9 GB model memory. Cloud features are disabled and S3 remains off.
- S3 adapter tested using a fake AWS CLI runner. Zero live AWS calls; no paid services enabled.
- Headless Chrome browser QA passed for creating packs and loading the new diagram. Verified a real PNG download with a valid signature and 1080 × 1080 dimensions, checked the SVG export link, and visually inspected memory-image PNGs for all three demo topics.
- Final live Chrome check generated a custom Circuit breakers pack through the running studio using Qwen3, loaded its memory diagram, downloaded a valid 1080 × 1080 PNG and verified the SVG export link.
- Added tests for recall cues, escaped model text, custom concept maps, and generating the new asset for existing packs without additional provider calls.
- No Docker build, public hosting, Instagram publishing, portfolio writes or new remote Git repository creation performed.

The earlier sandbox-only HTTP test attempt could not bind loopback; the complete suite passed when run with local-listener permission. The final integration run uses the existing Developer directory.
