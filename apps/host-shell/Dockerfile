FROM node:20-alpine AS builder

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/host-shell ./apps/host-shell
COPY packages ./packages

RUN npm install -g pnpm && pnpm install --frozen-lockfile

WORKDIR /app/apps/host-shell
RUN pnpm build

FROM node:20-alpine

WORKDIR /app/apps/host-shell

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/host-shell/dist ./dist
COPY --from=builder /app/apps/host-shell/package.json ./package.json
COPY --from=builder /app/apps/host-shell/vite.config.ts ./vite.config.ts

EXPOSE 3000

CMD ["node", "node_modules/.bin/vite", "preview", "--port", "3000", "--host", "0.0.0.0"]
