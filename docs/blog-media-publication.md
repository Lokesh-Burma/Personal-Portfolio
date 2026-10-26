# Reviewed architecture post publication

Publication was explicitly approved after review. The approved image version omits the Sydney label. No AI inference or processing settings change as part of publication.

Inline standalone Markdown image blocks are rendered as images with a full-size link. Destinations must be HTTPS or root-relative; scripts, data URLs, protocol-relative URLs, credentials and backslashes are rejected. The browser loads image files directly; no server-side remote-image fetch was added. Long reference URLs now wrap on mobile.

Blog media under public/images/blog uses content-addressed filenames. These files have a one-year immutable cache header and a dedicated CloudFront cache behavior. Never overwrite an existing image URL; change the content hash when an image changes. Dynamic application, owner and API routes remain uncached.

Build packages preserve internal dependency symlinks and exclude content/drafts. Export builds to a clean destination: Docker's local exporter can leave files from previous exports in an existing destination. The final publication artifact was inspected for environment files and unpublished drafts.

Before publishing the post, deploy the frontend revision and update the production web endpoint's PortfolioRevisionId parameter. Verify the image's public bytes match the reviewed local file, then change only the reviewed post's content, cover and status through the authenticated API. Preserve unrelated post fields and refuse to overwrite an independently edited draft. Confirm its public API, index and page after publication.

The private editorial source and publication record remain under content/drafts/portfolio-techcanvas-aws, excluded from Git and Docker builds. The blog API remains the source of truth for the published post.
