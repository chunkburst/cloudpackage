# ---- Stage 1: Build Frontend ----
FROM node:22-alpine AS frontend-builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app
COPY pnpm-workspace.yaml tsconfig.base.json package.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/frontend/package.json packages/frontend/tsconfig.json ./packages/frontend/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src ./packages/shared/src
COPY packages/frontend/src packages/frontend/index.html packages/frontend/tailwind.config.js packages/frontend/postcss.config.js packages/frontend/vite.config.ts ./packages/frontend/

RUN pnpm --filter @cloudpackage/frontend build

# ---- Stage 2: Build Worker ----
FROM node:22-alpine AS worker-builder

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app
COPY pnpm-workspace.yaml tsconfig.base.json package.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/worker/package.json packages/worker/tsconfig.json packages/worker/wrangler.toml ./packages/worker/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src ./packages/shared/src
COPY packages/worker/src ./packages/worker/src

RUN pnpm --filter @cloudpackage/worker build

# ---- Stage 3: Production ----
FROM node:22-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=frontend-builder /app/packages/frontend/dist ./static
COPY --from=worker-builder /app/packages/worker/dist ./worker
COPY --from=worker-builder /app/node_modules ./node_modules
COPY --from=worker-builder /app/packages/worker/package.json ./worker/package.json
COPY --from=worker-builder /app/packages/shared ./packages/shared

ENV NODE_ENV=production
ENV STORAGE_DRIVER=local
ENV LOCAL_STORAGE_PATH=/data

RUN mkdir -p /data

EXPOSE 8787

USER appuser

CMD ["node", "--experimental-specifier-resolution=node", "worker/index.js"]
