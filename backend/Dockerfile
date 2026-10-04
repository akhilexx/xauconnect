# XAUConnect backend — multi-stage build (run from repo root context)
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/
COPY packages/utils/package.json packages/utils/
COPY prisma ./prisma
RUN pnpm install --filter @xauconnect/backend... --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/utils ./packages/utils
COPY backend ./backend
RUN pnpm --filter @xauconnect/backend db:generate \
  && pnpm --filter @xauconnect/backend build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 4000
CMD ["node", "backend/dist/index.js"]
