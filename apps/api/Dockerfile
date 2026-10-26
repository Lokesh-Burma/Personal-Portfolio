# Optional local container runtime. AWS currently receives ZIP packages instead.
FROM node:24-bookworm-slim AS build
WORKDIR /source
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build && node scripts/package-aws.mjs
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4000 AWS_LAMBDA_HTTP_ENDPOINT=0.0.0.0:4000
COPY --from=build --chown=node:node /source/.aws-build/api/ ./
USER node
EXPOSE 4000
CMD ["node", "index.js"]
