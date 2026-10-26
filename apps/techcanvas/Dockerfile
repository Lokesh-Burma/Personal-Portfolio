# Local curated-demo studio only; production UI remains S3/CloudFront.
FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json *.mjs ./
COPY --chown=node:node public ./public
COPY --chown=node:node scripts/container.mjs ./scripts/container.mjs
RUN mkdir data && chown node:node data
ENV CONTENT_PROVIDER=demo PORT=4310 DATA_DIR=/app/data
USER node
EXPOSE 4310
CMD ["node", "scripts/container.mjs"]
