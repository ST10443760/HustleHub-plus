# syntax=docker/dockerfile:1
#
# HustleHub+ client image.
#
# 1. build: installs dependencies and runs `vite build`, which also runs the
#    CSP meta tag plugin from vite.config.js. The nginx security headers are
#    generated from the same securityHeaders.js, so there is one policy.
# 2. runtime: nginx-unprivileged (runs as a non-root user on port 8080)
#    serving only the built files. No Node, no source, no node_modules.

ARG NODE_IMAGE=node:22.23.4-alpine3.24
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.31.7-alpine3.24

# ---- Build ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js securityHeaders.js ./
COPY public ./public
COPY src ./src
COPY scripts ./scripts
RUN npm run build \
 # Fail the build if the CSP meta tag plugin didn't run.
 && grep -q 'http-equiv="Content-Security-Policy"' dist/index.html \
 && node scripts/nginx-security-headers.mjs > /app/security-headers.conf

# ---- Runtime ----
FROM ${NGINX_IMAGE} AS runtime
# Drop the stock pages (they name the server) before adding our own files.
USER root
RUN rm -rf /usr/share/nginx/html/*
COPY --chown=root:root nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=root:root /app/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build --chown=root:root /app/dist /usr/share/nginx/html

# The base image already runs as the unprivileged nginx user (uid 101).
USER 101
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/healthz"]
