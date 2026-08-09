---
name: architecture-blueprints
description: >-
  Scaffold and structure new apps using proven Corebita architecture blueprints:
  central backend (corebita-core), dockerized edge microservice (corebita-pod),
  and SvelteKit frontend (corebita-svelte), including default libraries (pino,
  eslint, prettier, husky, lint-staged, commitlint, vitest, zod, knex, express).
  Use when starting a new project, choosing folder layout, scaffolding modules,
  picking default tooling/libraries, or asking for architecture templates.
---

# Architecture Blueprints

Reusable project structures extracted from Corebita. Prefer these layouts for new work unless the user specifies otherwise.

## When to use

- Starting a new backend, edge service, or frontend
- Choosing folder ownership / layering for a greenfield repo
- Scaffolding a GraphQL domain module
- Reviewing whether a change belongs in transport, service, repository, or UI
- Porting Corebita patterns into a non-Corebita project

## Pick a blueprint

| Need | Blueprint | Reference |
|------|-----------|-----------|
| Central multi-tenant API, PostgreSQL, GraphQL, orchestration | **Central backend service** | [backend-central-service.md](backend-central-service.md) |
| Dockerized edge runtime, local DB, sync/messaging, k8s deploy | **Edge microservice** | [edge-docker-microservice.md](edge-docker-microservice.md) |
| Operator/user UI, routes, GraphQL client, feature modules | **SvelteKit frontend** | [frontend-sveltekit.md](frontend-sveltekit.md) |

If the product needs more than one of these, treat them as separate repos (or packages) with explicit contracts — do not collapse UI + central DB + edge sync into one tree.

## Default libraries & tooling

Always apply the shared defaults in [default-libraries.md](default-libraries.md) when scaffolding:

- **Logging**: pino (+ pino-http on servers; pino-pretty in dev)
- **Quality**: eslint, prettier, typescript (strict)
- **Git**: husky, lint-staged, commitlint (conventional commits)
- **Tests**: vitest
- **Common**: dotenv, zod, uuid, axios

Do not substitute winston/jest/ad-hoc console logging for new projects unless the user explicitly requests it.

## Shared layering principles

These rules apply across all three blueprints:

1. **Thin transport** — resolvers, controllers, and route handlers stay thin.
2. **Services own behavior** — business rules live in services, not transport or UI.
3. **Repositories own persistence** — no ad-hoc SQL/queries scattered in resolvers or components.
4. **Infra is adapters** — DB, HTTP, MQ, auth, observability live under `infra/` (or frontend `lib/infra/`).
5. **Modules own domains** — one domain folder with types, mapper, repository, service, and GraphQL (or UI feature module).
6. **Reuse before inventing** — extend an existing module/folder; do not create parallel trees.
7. **Contracts are explicit** — frontend consumes backend contracts; edge services do not invent central schema.

## Scaffolding workflow

Copy this checklist and track it:

```
Architecture scaffold:
- [ ] Blueprint selected (backend / edge / frontend)
- [ ] Reference file read
- [ ] default-libraries.md applied (pino, eslint, husky, vitest, …)
- [ ] Root tree + tooling configs created (.husky, eslint, prettier, vitest)
- [ ] Bootstrap / entrypoint wired
- [ ] Observability logger stubbed (pino)
- [ ] First domain module scaffolded from the template
- [ ] Infra adapters stubbed (db, http, mq/auth as needed)
- [ ] Validation plan noted (lint / typecheck / tests / docker build)
```

### Step 1 — Select blueprint

Ask (or infer): Is this a central service, an edge microservice, or a frontend?

### Step 2 — Read the matching reference

Open only the relevant reference file. Do not load all three unless building a multi-repo system.

### Step 3 — Create the tree

Create folders from the blueprint tree **as written**. Prefer the naming in the reference over inventing synonyms (`helpers` vs `utils`, etc.).

### Step 4 — Scaffold the first module

Use the module file template in the reference. Keep naming consistent:

```
{name}.types.ts
{name}.mapper.ts
{name}.repository.ts
{name}.service.ts
graphql/{name}.graphql
graphql/{name}.resolver.ts
```

Frontend equivalent: `routes/` + `lib/modules/{feature}/` + `lib/components/{feature}/` + `lib/infra/`.

### Step 5 — Wire bootstrap

Backend/edge: `src/core/bootstrap.ts` initializes DB → DI container → messaging (if any) → HTTP → graceful shutdown.

Frontend: SvelteKit `src/routes` + `src/lib` with infra clients under `lib/infra/`.

### Step 6 — State boundaries

Before coding features, document:

- what this repo owns
- what it must not own
- which contracts it produces/consumes

## Anti-patterns

Never:

- Put business rules in GraphQL resolvers, Express controllers, or Svelte route files
- Put SQL in the UI or in resolvers “just this once”
- Mix central PostgreSQL assumptions into an edge SQLite/local service
- Invent GraphQL fields in the frontend without a backend contract
- Create `utils2/`, `helpers/common/`, or parallel `services/` trees outside modules
- Skip Docker/k8s layout for edge services that are meant to ship as containers

## Output when scaffolding

When creating or recommending structure, return:

1. **Blueprint chosen** and why
2. **Proposed tree** (folders only, concise)
3. **Default libraries** to install (from default-libraries.md + blueprint extras)
4. **First module** path and files
5. **Ownership boundaries** (owns / does not own)
6. **Next validation** (e.g. `lint`, `typecheck`, `docker build`, `svelte-check`)

## Relationship to Corebita project skills

Inside the Corebita workspace, also use project skills for product-specific rules (`corebita-architecture-discovery`, GraphQL, Knex, RabbitMQ, sync). This personal skill is the **portable structure template** for new or non-Corebita projects.
