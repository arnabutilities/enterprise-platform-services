# Build from monorepo root: docker build -f services/bff/Dockerfile .
FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY contracts/package.json ./contracts/
COPY security/package.json ./security/
COPY observability/package.json ./observability/
COPY packages/shared-pubsub/package.json ./packages/shared-pubsub/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/platform-auth/package.json ./packages/platform-auth/
COPY services/bff/package.json ./services/bff/

RUN pnpm install --filter bff...

COPY contracts ./contracts
COPY security ./security
COPY observability ./observability
COPY packages/shared-pubsub ./packages/shared-pubsub
COPY packages/shared-types ./packages/shared-types
COPY packages/platform-auth ./packages/platform-auth
COPY services/bff/src ./services/bff/src
COPY services/bff/tsconfig.json services/bff/jest.config.js ./services/bff/

WORKDIR /app/services/bff
RUN pnpm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

COPY --from=build /app/pnpm-workspace.yaml /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/contracts ./contracts
COPY --from=build /app/security ./security
COPY --from=build /app/observability ./observability
COPY --from=build /app/packages ./packages
COPY --from=build /app/services/bff/package.json ./services/bff/
COPY --from=build /app/services/bff/dist ./services/bff/dist

WORKDIR /app/services/bff

ENV NODE_ENV=production
ENV PORT=4000
ENV SKIP_DATABASE=true
ENV USE_MEMORY_CACHE=true

EXPOSE 4000

CMD ["node", "dist/main.js"]
