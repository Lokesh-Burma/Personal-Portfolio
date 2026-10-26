# Learning map

| Technology / concept | Where it appears | What to learn next |
| --- | --- | --- |
| Node HTTP / async I/O | `server.mjs` routes and background tasks | Graceful shutdown, event loop and backpressure |
| SQLite / WAL | Persistent job metadata | Transactions, durability and consistent backups |
| Idempotency key | Unique request key + payload fingerprint | Retry windows, concurrent requests and external side effects |
| Job state machine | queued → running → completed/failed | Durable workers, leases and crash recovery |
| Provider adapter | Demo and local Ollama implementations | Model evaluation, structured output validation and prompt injection boundaries |
| SVG / Canvas | Editable diagrams → square browser PNGs | Typography, layout bounds and export accessibility |
| S3 object keys / IAM | Disabled upload adapter | Private buckets, least privilege, signed URLs and lifecycle retention |
| Same-origin policy / CSP | Local API/browser boundaries | CSRF, DNS rebinding and authentication before public exposure |
| Contract compatibility | Portfolio draft JSON | Versioned APIs and integration tests |
| Unit / integration tests | Node built-in test runner | Testing failure paths without paid external calls |
| Cost engineering | Single small server, SQLite, local AI | Regional pricing, transfer limits, taxes and budget notifications |

No Redis, managed database, load balancer or distributed microservice platform is required for this single-user MVP. Add components when measured needs justify them.
