# Build the SPA, then serve it from nginx, which also proxies /api to the
# backend so the browser only ever talks to one origin.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# The tag compose applies comes from .env, the source from the VERSION file.
# Refuse to build when they disagree, so a stale .env cannot put this source
# under another version's tag and overwrite the image a rollback would use.
ARG VERSION
RUN [ "$(tr -d '[:space:]' < VERSION)" = "${VERSION}" ] \
    || { echo "VERSION file does not match the tag ${VERSION}: run ./deploy.ps1" >&2; exit 1; }
# "/" makes the client call its own origin; see BASE_URL in src/api/client.ts.
ARG VITE_API_BASE_URL=/
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.29-alpine
ARG VERSION
LABEL org.opencontainers.image.version="${VERSION}"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
