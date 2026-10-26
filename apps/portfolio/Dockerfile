# Optional local container runtime. AWS currently receives ZIP packages instead.
FROM node:24-bookworm-slim AS build
WORKDIR /source
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build && node scripts/package-aws.mjs
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /source/.aws-build/portfolio/ ./
USER node
EXPOSE 3000
CMD ["node", "index.js"]
