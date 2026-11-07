# syntax=docker/dockerfile:1
#
# HustleHub+ API image.
#
# - Two stages: production dependencies are installed in their own stage,
#   so npm's cache and the lockfile install never reach the final image.
# - Runs as the unprivileged "node" user. The app files are owned by root,
#   so the running process can't change its own code.
# - Nothing secret is baked in: no .env, no certs, no keys. Settings come
#   from the environment (docker-compose.yml) and the TLS cert is mounted
#   at /app/certs at runtime. .dockerignore only lets the files below in.

# ---- Production dependencies ----
# Node 22 on Alpine, pinned to an exact version (both stages use the same one).
FROM node:22.23.4-alpine3.24 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: none of the dependencies need an install script.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ---- Runtime ----
FROM node:22.23.4-alpine3.24 AS runtime
ENV NODE_ENV=production \
    PORT=5000 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_CACHE=/tmp/.npm
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY src ./src
COPY scripts/healthcheck.js scripts/seedAdmin.js scripts/cleanTestData.js ./scripts/

USER node
EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD ["node", "scripts/healthcheck.js"]

CMD ["node", "src/server.js"]
