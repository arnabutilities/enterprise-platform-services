# Infrastructure Configuration

## Local development

From the monorepo root:

```bash
pnpm run infra:up
pnpm run infra:health
pnpm run infra:down
```

These commands start Postgres and Redis from [docker/docker-compose.yml](./docker/docker-compose.yml).

## Docker Compose stacks

All compose files live under [docker/](./docker/). See [docker/README.md](./docker/README.md) for the full layout.

| Command                       | Starts                                    |
| ----------------------------- | ----------------------------------------- |
| `pnpm run infra:up`           | Postgres + Redis                          |
| `pnpm run stack:up`           | Postgres + Redis + BFF (dev)              |
| `pnpm run stack:streaming:up` | Postgres + Redis + BFF + Redpanda         |
| `pnpm run stack:prod:up`      | Postgres + Redis + BFF (production-style) |

Stop matching stacks with the corresponding `:down` commands from the repository root.

The main local development path remains `pnpm dev`, which starts infra in Docker and runs frontend apps on the host.

## Kubernetes

Deploy with Kustomize:

```bash
kubectl apply -k infra/k8s/overlays/prod
```

## Terraform (Optional)

For cloud infrastructure:

```bash
cd terraform/environments/prod
terraform apply
```

## Helm (Optional)

Deploy with Helm:

```bash
helm install enterprise-platform infra/helm/charts/platform
```
