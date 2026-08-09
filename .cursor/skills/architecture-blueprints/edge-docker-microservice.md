# Edge Docker Microservice Blueprint

Derived from `corebita-pod` (dockerized edge runtime with local SQLite + sync).

Use for: edge/offline-capable services, local APIs, vendor integration workers, sync consumers, containerized Node microservices with k8s manifests.

Apply shared defaults from [default-libraries.md](default-libraries.md) (pino, eslint, husky, vitest, zod, …) plus edge extras (sqlite3, etc.).

## Responsibility

Owns:

- Local execution and local persistence
- Edge GraphQL/REST APIs
- Inbound sync / message consumers
- Docker image + environment-specific k8s deploy
- Idempotent, retry-safe processing

Does not own:

- Canonical multi-tenant gold data (central service)
- Frontend presentation
- Shared messaging SDK internals (consume the SDK; don’t fork it)

## Root tree

```
service-name/
├── AGENTS.md
├── Dockerfile                 # multi-stage; runtime ships dist + native deps
├── knexfile.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.ts
├── .nvmrc
├── .env.example
├── .husky/
├── prometheus.yml             # optional metrics scrape config
├── __tests__/
├── databases/                 # local DB files / volume mount target (gitignore data)
├── k8s/
│   ├── dev/
│   ├── staging/
│   └── ...
├── scripts/
└── src/
    ├── index.ts
    ├── core/                  # bootstrap, DI, config, lifecycle
    ├── app/                   # HTTP routes/controllers/jobs
    ├── modules/               # domain modules (flat or grouped)
    ├── infra/                 # db (sqlite), http, graphql, mq, auth, observability (pino)
    └── shared/
```

Same high-level layering as the central backend blueprint — intentionally — so engineers can move between repos without relearning trees. Differences are **runtime assumptions**, not folder names.

## What makes it “edge”

| Concern | Edge default | Central default |
|---------|--------------|-----------------|
| Database | SQLite (or other local store) | PostgreSQL |
| Data role | Local/silver/bronze, sync target | Canonical gold |
| Deploy unit | Docker image + per-env k8s | Docker + k8s (often larger footprint) |
| Network | Must degrade when upstream is down | Source of truth; orchestrates |
| Migrations | Run on boot / local migrate | Controlled migrate pipelines |
| Messaging | Consume central→edge; publish edge→central | Orchestrate / fan-out |

## `src/` layer map

| Path | Owns |
|------|------|
| `src/core/` | Bootstrap, container, config |
| `src/app/` | routes, controllers, presenters, jobs, services |
| `src/modules/` | Domain features (endpoints, sync, workflows, tables, …) |
| `src/infra/` | db, graphql, http, mq, auth, observability (+ vendor adapters) |
| `src/shared/` | helpers only |

### Typical `infra/` for edge

```
src/infra/
├── db/                 # SQLite init + migrations
├── graphql/
├── http/
├── mq/                 # adapter + consumers
├── auth0/
├── observability/
└── <vendor>/           # optional vendor SDK wrappers (keep thin)
```

## Domain module template

Same file pattern as central services:

```
src/modules/<domain>/
├── <domain>.types.ts
├── <domain>.mapper.ts
├── <domain>.repository.ts
├── <domain>.service.ts
└── graphql/
    ├── <domain>.graphql
    └── <domain>.resolver.ts
```

Edge-specific module examples (from pod): `sync`, `endpoints`, `connections`, `data_maps`, `sql_queries`, `workflows`, `bronze_etl`.

## Bootstrap sequence

Edge-friendly order (from `corebita-pod`):

1. Initialize local DB
2. Run migrations (`migrate.latest` and/or service-owned pending migrations)
3. Create DI container
4. Init messaging
5. Start inbound consumers
6. Start HTTP server
7. Graceful shutdown (MQ → DB)

Design for **restart safety**: boot must be idempotent.

## Docker blueprint (required for this archetype)

Use multi-stage builds:

**Build stage**

- Node LTS Alpine (or pinned version)
- Install build toolchain only if native modules need it (e.g. `sqlite-dev`, `python3`, `make`, `g++`)
- `npm ci` / `yarn` with registry auth via build secret or build-arg → wipe `.npmrc` after install
- Compile TypeScript → `dist/`
- Copy `.graphql` assets into `dist`

**Runtime stage**

- Slim Node Alpine + `tini`
- Runtime libs only (e.g. `sqlite-libs`) — no compilers
- Non-root user
- Copy `package*.json`, `node_modules`, `dist`
- Create writable dirs for local DB (`/app/databases`)
- `NODE_ENV=production`
- Entry via `tini` → `node dist/index.js` (or equivalent)

### k8s layout

```
k8s/<env>/
├── namespace.yaml
├── <svc>-deployment.yaml
├── <svc>-service.yaml
├── <svc>-ingress.yaml
├── <svc>-config.yaml
├── <svc>-secrets.yaml
└── <svc>-ssl-redirect-service.yaml   # optional
```

Keep secrets out of git content; ship templates or sealed-secret placeholders.

## Local persistence rules

- Do not assume PostgreSQL features (JSONB operators, arrays, partial indexes, etc.)
- Prefer SQLite-safe types and constraints
- Volume-mount `databases/` in containers
- Sync/transform logic must be explicit and observable
- Prefer idempotent upserts; document conflict keys

## Messaging / sync rules

- Prefer a shared messaging SDK over bespoke AMQP code
- Consumers must tolerate retries and duplicates
- Keep payload contracts versioned / backward compatible
- Log enough context to debug sync steps without leaking secrets

## Default stack (install these)

Same as central backend **except** local DB:

**Runtime:** express, cors, graphql, graphql-yoga, knex, **sqlite3**, pino, pino-http, dotenv, zod, uuid, axios, prom-client, node-cron (+ messaging SDK)

**Tooling:** typescript, tsx, tsc-alias, copyfiles, vitest, eslint (+ optional eslint-plugin-security), prettier, husky, lint-staged, commitlint, pino-pretty

**Observability:** shared pino logger under `src/infra/observability/`; request logging via pino-http.

## Scripts worth mirroring

- `dev` / `build` / `start` / `typecheck` / `test` / `test:ci` / `lint` / `format`
- `prepare` — `husky`
- `db:migrate:create`, `db:migrations`, `db:setup`
- `run:module:generator`
- Docker: `docker build` with required build secrets

## Extension checklist

1. Confirm the change belongs on the edge (local execution / sync) vs central
2. Extend the owning module under `src/modules/`
3. Keep handlers thin; put transforms in services
4. If schema changes → note migration + sync impact
5. Validate: unit tests + typecheck + `docker build` when packaging changes
