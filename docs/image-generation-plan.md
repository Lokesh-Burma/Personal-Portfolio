# Real image generation for TechCanvas

Status: proposal, 26 October 2026. No model invocation, subscription, region change or deployment has been performed.

## What exists

The Node studio adapter and the new Go worker contain a bounded Amazon Nova Lite Converse text call. Production inference is disabled, its role has no Bedrock invocation permission, and processing triggers remain disabled. The eight-asset pack uses deterministic SVG rendering. There is no raster image-model call. The Go worker is implemented and tested locally, not deployed.

Repository consolidation is complete; application consolidation is not. The proposed target is one Next.js application for portfolio, blog, TechCanvas and server routes, plus one Go background worker. Existing NestJS and studio functionality must be migrated with authentication and draft-isolation regression checks before removing either application.

## Proposed image workflow

1. The authenticated owner submits a topic to the common application. Reserve a distinct image-attempt allowance atomically before enqueueing work; the existing text quota is not an image spending limit.
2. The Go worker produces/validates the explanation and a bounded visual brief. The brief describes the actual concept, intended composition and brand style; avoid passing arbitrary instructions or private documents.
3. A separate image-provider interface invokes a real text-to-image model using its supported image API. Start with one requested image per job and a fixed supported size/aspect ratio. Bedrock image models use provider-specific InvokeModel payloads; the current Converse text adapter is not an image generator.
4. Validate response status, moderation result, decoded byte limit, actual image type, dimensions and pixel count. Store the generated image in private S3 with provenance/model metadata. Use short-lived authorized preview links; never expose provider credentials to the browser.
5. Display the generated image and explanatory text as a draft. Allow an explicit regenerate action that reserves another attempt. Do not automatically repeat a potentially charged call after a timeout. Keep uncertain outcomes counted and expose a useful job status.
6. Publish only after review. Promotion must copy selected media into a durable public publishing location and update the cover reference; private expiring preview URLs cannot become published covers. Existing portfolio imports deliberately clear cover URLs and need an explicit media integration.

The generated pixels are the primary visual. For technical diagrams, model-rendered spelling, arrows and relationships must be reviewed. Optional precise labels can be composed over generated artwork; ordinary SVG templates must not be presented as image-model output. Keep the current deterministic mode explicitly labelled as a separate option.

## Candidate and region constraint

AWS currently lists Stable Image Core 1.0 (`stability.stable-image-core-v1:1`) as Active, with image output through InvokeModel, in us-west-2 only. It is a candidate for an illustration quality trial, not a validated choice for detailed engineering infographics. Keep the application/storage in the existing region if image inference in another region is approved. Prompts and responses would cross regions; check access, terms, data transfer and actual account pricing before activation.

Current project rules allow only the selected application region. Any image-model region exception must be explicitly approved and reflected in the configuration, IAM and tests. Do not silently change the global region or repurpose the existing text-model permission boundary. Nova Canvas is not a new-integration candidate: AWS lists its EOL date as 30 September 2026.

An external image API is another option if quality tests justify it; AWS hosting does not require an AWS model provider. That requires separate provider billing, credential handling, privacy review and approval. No provider has been enabled by this proposal.

## Budget and rollout

The total target remains roughly ₹1,000/month, including hosting, text, images, storage, transfer and applicable tax. Do not derive image capacity from the existing 300 text attempts/month. Obtain the current per-image quote for the chosen model/quality and conservative INR conversion, reserve hosting headroom, then derive a small daily/monthly image-attempt limit from the remaining allocation. Recheck the allowance in the worker before every chargeable call. Application limits control this image path; they do not impose a hard AWS account billing cap.

Implement the disabled provider adapter and contract/fixture tests first. Then request approval for the exact provider/model, region exception, maximum trial spend and invocation count. Run a small approved quality trial covering circuit breakers, database indexing and consistent hashing; review concept correctness, text, latency and actual cost. Only after that decide whether to activate hosted generation. Do not create GPU instances, provisioned model capacity or always-on endpoints for this budget.

## Blog revision

A local revision is saved alongside the original reviewed article as `apps/portfolio/content/drafts/portfolio-techcanvas-aws/article-revision-draft.md`. It adds the Go worker and distinguishes repository consolidation from the planned common application and proposed image generation. The published article and architecture image remain a description of the currently deployed system. Update the image and publish a final revision after the runtime architecture actually changes.

## Sources checked

- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-stability-ai-stable-image-core-1-0.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html
- https://aws.amazon.com/bedrock/pricing/
