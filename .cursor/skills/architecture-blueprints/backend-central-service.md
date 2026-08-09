# Central Backend Service Blueprint

Derived from `corebita-core` (Postgres-backed multi-tenant API + orchestration).

Use for: central APIs, multi-tenant business logic, GraphQL contracts, CDC/orchestration, k8s-deployed Node services.

Apply shared defaults from [default-libraries.md](default-libraries.md) (pino, eslint, husky, vitest, zod, …) plus the backend extras below.

## Responsibility

Owns:

- Canonical business data and rules
- PostgreSQL as source of truth
- GraphQL (and optional REST) APIs
- Orchestration / jobs / CDC-facing workers
- Contract production for frontends and edge services

Does not own:

- Operator UI
- Edge-local offline execution
- Vendor-facing bronze sync runtime (usually edge)

## Root tree

```
service-name/
├── AGENTS.md                 # ownership + design rules
├── Dockerfile                # multi-stage Node build/runtime
├── knexfile.ts               # migrations config
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.ts
├── .nvmrc
├── .env.example
├── .husky/                   # pre-commit, commit-msg, optional pre-push
├── __tests__/
├── k8s/                      # env-specific manifests
│   ├── development/
│   ├── staging/
│   └── production/
├── scripts/                  # generators, ops helpers
└── src/
    ├── index.ts              # process entry
    ├── core/                 # bootstrap, DI, lifecycle, config
    ├── app/                  # HTTP/REST surface (optional)
    ├── modules/              # domain GraphQL modules
    ├── infra/                # adapters (incl. observability/pino)
    └── shared/               # cross-cutting helpers (no domain logic)
```

## `src/` layer map

| Path | Owns | Notes |
|------|------|-------|
| `src/core/` | Bootstrap, DI container, config, lifecycle | Wire adapters once; keep thin |
| `src/app/` | REST routes, controllers, presenters, jobs | Thin HTTP; call services |
| `src/modules/` | Domain modules (GraphQL + service + repo) | Prefer versioned trees (`v1/`, `v2/`) when evolving APIs |
| `src/infra/` | db, graphql, http, mq, auth, cdc, cron, k8s, observability | Adapters only |
| `src/shared/` | Pure helpers, tenant utilities | No persistence, no transport |

### Typical `infra/` adapters

```
src/infra/
├── db/                 # init, migrations, tenant migrations
├── graphql/            # schema stitch / server wiring
├── http/               # Express (or similar) server
├── mq/                 # messaging adapter + consumers
├── auth0/              # or other auth adapter
├── cdc/                # change-data-capture workers
├── cron/               # scheduled jobs
├── kubernetes/          # optional cluster helpers
└── observability/      # logger, metrics, tracing
```

### Typical `app/` surface

```
src/app/
├── routes/
├── controllers/
├── presenters/
├── services/           # app-level orchestration only if not domain-owned
└── jobs/
```

## Domain module template

Prefer one folder per domain. Core pattern used by `corebita-core`:

```
src/modules/v2/<area>/<domain>/
├── <domain>.types.ts
├── <domain>.mapper.ts
├── <domain>.repository.ts
├── <domain>.service.ts
└── graphql/
    ├── <domain>.graphql
    └── <domain>.resolver.ts
```

Rules:

- Resolver → Service → Repository
- Mapper converts DB/API shapes; keep out of resolvers
- Types are explicit; avoid `any`
- GraphQL schema files are copied into `dist` at build time

## Bootstrap sequence

Match the Corebita core order unless there is a strong reason not to:

1. Initialize DB
2. Create DI container (services/repos)
3. Init messaging adapter
4. Start consumers / CDC workers
5. Start HTTP server
6. Start cron (if needed)
7. Register graceful shutdown (MQ → DB → exit)

## Multi-tenant + DB rules

- PostgreSQL is canonical
- Preserve tenant isolation (search_path / schema discipline)
- Prefer explicit upsert conflict keys
- Separate platform migrations vs tenant migrations when needed
- Call out any change that affects downstream sync consumers

## Docker / deploy expectations

Even as a “central” service, ship like production software:

- Multi-stage `Dockerfile` (build → runtime)
- Non-root runtime user when practical
- `k8s/<env>/` for deployment, service, ingress, config, secrets
- Build secrets for private npm registries (never bake tokens into layers)

## Default stack (install these)

**Runtime:** express, cors, graphql, graphql-yoga, graphql-tag, `@graphql-tools/*`, knex, pg, pino, pino-http, dotenv, zod, uuid, axios, prom-client, node-cron, jsonwebtoken / jwks-rsa (as needed)

**Tooling:** typescript, tsx, tsc-alias, copyfiles, vitest, eslint + typescript-eslint, prettier, husky, lint-staged, commitlint, pino-pretty, rimraf, cross-env

**Observability:** `src/infra/observability/logger.ts` exports `pino` logger + `pinoHttp` middleware — no ad-hoc `console.log` in services.

## Scripts worth mirroring

- `dev` — watch entry (`tsx watch src/index.ts`)
- `build` — `tsc` + alias rewrite + copy `.graphql`
- `typecheck` / `test` / `test:ci` / `lint` / `format`
- `prepare` — `husky`
- `db:migrate:create`, `db:migrations`, tenant migrate helpers
- Optional `run:module:generator` for scaffolding modules

## Extension checklist

Before adding a feature:

1. Find the owning module under `src/modules/`
2. Extend service/repo; keep resolver thin
3. If new domain → create full module folder, not a lone file in `shared/`
4. If contract changes → note frontend / edge consumers
5. Validate with the narrowest tests + typecheck
