# ─── Stage 1: deps ────────────────────────────────────────────────────────────
# Install ALL deps (including devDeps) — tailwindcss, postcss, typescript, etc.
# are required by `next build`. Only the standalone output is copied to runner.
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build with standalone output (set in next.config.mjs).
# Env vars needed only at build time are passed via Cloud Build substitutions;
# runtime secrets are injected by Cloud Run and never baked into the image.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets (CSS, JS chunks, images)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Public directory (fallback JSON, icons, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

# Cloud Run injects PORT at runtime (default 8080)
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
