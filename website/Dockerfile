FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./standalone
COPY --from=builder /app/public /tmp/public
COPY --from=builder /app/.next/static /tmp/static
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN if [ -f ./standalone/website/server.js ]; then \
      SERVER_DIR=./standalone/website; \
    elif [ -f ./standalone/server.js ]; then \
      SERVER_DIR=./standalone; \
    else \
      echo "server.js not found in standalone output" >&2; exit 1; \
    fi \
  && cp -r /tmp/public "$SERVER_DIR/public" \
  && mkdir -p "$SERVER_DIR/.next" \
  && cp -r /tmp/static "$SERVER_DIR/.next/static" \
  && rm -rf /tmp/public /tmp/static \
  && chmod +x /docker-entrypoint.sh \
  && chown -R nextjs:nodejs ./standalone /docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
