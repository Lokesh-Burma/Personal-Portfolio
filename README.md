# TechCanvas AI

A local concept studio: technical topic → three visual notes + one summary image + an icon-based visual memory aid + one sentence + one paragraph + a Markdown blog draft. Export square PNGs for Instagram and draft JSON matching the existing portfolio API.

## Run locally

Requires Node.js 24 or newer (tested with the machine's Node 26.4.0). No npm dependencies, database server, cloud credentials, or paid API keys required.

```sh
cd ~/Developer/techcanvas-ai
cp .env.example .env # only on first setup; preserve your existing config
npm run dev
```

Open http://127.0.0.1:4310. `npm start` runs without file watching. Stop with Ctrl+C.

```sh
npm run check
npm test
```

Default mode is explicitly **curated demo**, with Cache Aside, Idempotency, and Message Queues. It does not claim to be AI-generated. Each pack is stored in `data/techcanvas.sqlite` with files in `data/<job-id>/`. Restarting preserves completed jobs and marks interrupted jobs failed so they can be retried. Run only one application process against a data directory.

## Real local AI

The Ollama adapter accepts arbitrary technical topics and renders its structured response into diagrams. Ollama and model weights were **not installed** on this machine during implementation, so live model inference remains unverified. No automatic installation or model download occurs.

With an already-installed local Ollama server and an installed model, set these in `.env`, then restart:

```dotenv
CONTENT_PROVIDER=ollama
OLLAMA_MODEL=llama3.2
```

The only inference endpoint is `http://127.0.0.1:11434/api/generate`; hosted/paid providers cannot be selected. Model calls time out after two minutes. Invalid output fails visibly rather than silently falling back to demo content. The diagrams are deterministic SVG compositions of the explanation, not diffusion-generated illustrations. Browser downloads rasterize them to 1080 × 1080 PNGs.

## Review and export

1. Enter a topic or choose an example; generate a pack.
2. Read the sentence, paragraph and blog draft; review factual accuracy.
3. Download summary/concept PNGs and the caption for manual Instagram upload.
4. Download `blog.md` or `portfolio.json` for the existing portfolio. The JSON uses `title`, `summary`, `content_markdown`, `tags`, `status: "draft"`, matching `~/Developer/portfolio-api/src/blogs/dto/create-blog.dto.ts`.

Nothing is posted to Instagram or your portfolio automatically. This MVP does not yet include an in-app content editor or authenticated public hosting.

## Optional S3 adapter — disabled

`S3_UPLOAD_APPROVED=false` is the shipped default. Merely having AWS credentials does not enable it. **Do not change it until the user explicitly approves paid AWS usage.** After approval, configure an existing private bucket, region, AWS CLI and scoped credentials externally. An explicit button uploads the eight text/SVG files under `techcanvas/<job-id>/`. PNGs are browser exports and are not uploaded by this adapter. No bucket creation, public ACL, scheduled upload or deployment code runs. A partial upload can be retried at the same keys; extra PUTs may cost money. CLI integration is tested with a fake runner, not a real AWS account.

## API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/health` | Health probe |
| GET | `/api/config` | Provider, example topics, S3 gate |
| POST | `/api/jobs` | JSON `{ "topic": "Cache Aside" }`; returns 202 |
| GET | `/api/jobs` | Latest 100 jobs |
| GET | `/api/jobs/:id` | Job status and generated content |
| POST | `/api/jobs/:id/retry` | Retry a failed job |
| GET | `/api/jobs/:id/assets/:name` | Export asset |
| POST | `/api/jobs/:id/s3` | Explicit upload, approval gate required |

Optional `Idempotency-Key` header on creation replays the same logical request; a reused key with different input returns 409. Five in-flight jobs maximum; excess requests return 429. Bodies are limited to 8 KiB. Topic length is 3–120 characters. Assets are available only after completion.

## Operating limits

This is a single-user, loopback-only local app. Host/origin checks protect local state from cross-site requests; generated text is rendered as text and XML-escaped. Do not expose it to the internet without authentication, HTTPS, rate limits and a deployment review. Storage grows with use; manage retention manually. Back up the whole data folder with the app stopped (including SQLite WAL/SHM if present). No secrets or runtime data belong in Git.

See [design](docs/design.md), [learning map](docs/learning.md), [AWS cost plan](docs/aws-costs.md), and [validation](docs/validation.md).

## Visual memory aids

Each pack also includes `memory.svg`: a square diagram using icons, connections and a short recall cue. Curated topics use purpose-built flow diagrams (cache hit/miss and invalidation; idempotency retries and replay; queue delivery and retry). Custom local-AI topics use a concept map of the generated ideas without assuming a sequence. Download it as an editable SVG or a 1080 × 1080 PNG from the Visuals view. Existing saved packs receive this extra asset on first access, without another model call. No extra service or paid API is used.
