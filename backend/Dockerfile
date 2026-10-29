# syntax=docker/dockerfile:1
# Built by CI only (quality.md section 8), for linux/amd64 and linux/arm64 (the Mac mini).
# Build context is the backend/ folder.

FROM node:24-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

# Every dependency, to compile TypeScript.
FROM base AS build
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN yarn build

# Runtime dependencies only. bcrypt ships prebuilt binaries, so no install script or compiler is needed.
FROM base AS prod-deps
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn workspaces focus --production

FROM node:24-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8787
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node package.json ./
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/health/live').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
ENTRYPOINT ["tini", "--"]
# One-off jobs reuse this image: node dist/cli/migrate.js migrate, node dist/cli/housekeeping.js
CMD ["node", "dist/server.js"]
