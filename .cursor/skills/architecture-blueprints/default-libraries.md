# Default Libraries & Tooling

Use these defaults when scaffolding from any architecture blueprint unless the user specifies otherwise. Prefer this set over inventing alternate stacks.

## Shared across all Node/TS repos

| Concern | Default | Notes |
|---------|---------|-------|
| Language | **TypeScript** (strict) | `"type": "module"` |
| Runtime | **Node.js LTS** (pin in `.nvmrc` / Docker) | Match engine across services |
| Package manager | **yarn** or npm — pick one per repo and stick to it | Lockfile required |
| Env | **dotenv** | `.env.example` committed; never commit secrets |
| Validation | **zod** | Request/config/payload schemas |
| IDs | **uuid** | Prefer over hand-rolled ids |
| HTTP client | **axios** | Server-side outbound HTTP |
| Logging | **pino** | Structured JSON logs; see below |
| Tests | **vitest** (+ `@vitest/coverage-v8` in CI) | Prefer vitest over jest for new code |
| Lint | **eslint** (flat config) + **typescript-eslint** | `eslint.config.ts` / `.mjs` |
| Format | **prettier** | Align eslint with prettier where needed |
| Git hooks | **husky** + **lint-staged** | `prepare`: `husky` |
| Commits | **commitlint** + `@commitlint/config-conventional` | Conventional types |
| Build hygiene | **rimraf**, **cross-env**, **tsx** | Clean/build/dev scripts |

### Logging (pino) — required for backend & edge

```
dependencies:     pino, pino-http
devDependencies:  pino-pretty
```

- Export a shared logger from `src/infra/observability/logger.ts` (or frontend `lib/infra/logging/`)
- Wire `pino-http` on Express (or equivalent) for request logs
- Use `pino-pretty` only in local/dev transport — production stays JSON
- Prefer structured fields (`name`, ids, step) over string concatenation
- Do **not** default to winston/console for new services (legacy winston may exist; new code → pino)

### Husky / lint-staged / commitlint — required

```
.husky/
├── pre-commit      # lint-staged
├── commit-msg      # commitlint
└── pre-push        # optional: typecheck / test
```

`package.json` sketch:

```json
{
  "scripts": {
    "prepare": "husky",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit --pretty",
    "test": "vitest",
    "test:ci": "vitest run --coverage --passWithNoTests"
  },
  "lint-staged": {
    "src/**/*.{ts,tsx,js}": ["eslint --max-warnings=100 --fix"],
    "*.{json,md,yml,yaml}": ["prettier -w"]
  },
  "commitlint": {
    "extends": ["@commitlint/config-conventional"],
    "rules": {
      "type-enum": [2, "always", ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore"]],
      "subject-case": [2, "always", "sentence-case"]
    }
  }
}
```

### ESLint defaults (backend/edge)

```
eslint
@eslint/js
typescript-eslint
eslint-plugin-import
eslint-plugin-n
eslint-plugin-promise
globals
```

Edge may also add `eslint-plugin-security`.

### Always-present root files

```
.nvmrc
.env.example
eslint.config.ts          # or eslint.config.mjs
.prettierrc / prettier config
.husky/
vitest.config.ts
tsconfig.json
AGENTS.md                 # ownership rules for agents
```

---

## Central backend (`backend-central-service`) extras

| Concern | Default |
|---------|---------|
| HTTP | **express** + **cors** |
| GraphQL | **graphql**, **graphql-yoga**, **graphql-tag**, `@graphql-tools/*` |
| DB | **knex** + **pg** |
| Auth | **jsonwebtoken**, **jwks-rsa** (or Auth0 adapter) |
| Metrics | **prom-client** |
| Cron | **node-cron** |
| Messaging | shared RabbitMQ SDK (or project MQ adapter) |
| Path aliases | **tsc-alias**, **tsconfig-paths** |
| GraphQL build | **copyfiles** (copy `*.graphql` → `dist`) |
| Dev watch | **tsx watch** (primary); nodemon optional |

Dev/tooling also include: `@types/node`, `@types/express`, `@types/pg`, `@commitlint/*`, husky, lint-staged, prettier, pino-pretty.

Optional when needed: `@kubernetes/client-node`, CDC libs (`pg-logical-replication`), OpenTelemetry.

---

## Edge microservice (`edge-docker-microservice`) extras

Same as central backend **plus**:

| Concern | Default |
|---------|---------|
| Local DB | **sqlite3** (+ knex sqlite client) |
| Metrics | **prom-client** (+ optional `prometheus.yml`) |
| Observability | **pino** / **pino-http**; OpenTelemetry optional |
| Native build | Docker build packages for sqlite (`sqlite-dev`, g++, etc.) |

Keep central PG drivers out of edge unless there is an explicit dual-DB need.

---

## SvelteKit frontend (`frontend-sveltekit`) extras

| Concern | Default |
|---------|---------|
| Framework | **svelte@5**, **@sveltejs/kit**, **vite** |
| GraphQL client | **@urql/core** (+ **houdini** / houdini-svelte if codegen is used) |
| Validation | **zod** |
| Styling | **tailwindcss**, **postcss**, **autoprefixer** |
| UI primitives | **bits-ui**, **clsx**, **tailwind-merge**, **class-variance-authority**, **lucide-svelte** |
| Forms / toasts | **svelte-sonner**; form libs as needed |
| Lint | **eslint**, **eslint-plugin-svelte**, **eslint-config-prettier** |
| Format | **prettier**, **prettier-plugin-svelte** |
| Check | **svelte-check** |
| Unit tests | **vitest** |
| E2E | **@playwright/test** |
| Types | **typescript**, `@tsconfig/svelte` |

Frontend logging: keep a thin `lib/infra/logging` wrapper; prefer structured client logs sparingly. Server-side SvelteKit hooks may use **pino** if the app has a Node adapter — otherwise keep browser logging minimal.

Recommend adding to new frontends (even if a legacy app omitted them):

- **husky** + **lint-staged** + **commitlint** (same conventional commit policy)
- **prettier** + **eslint** wired in `lint` / pre-commit

---

## Install sketch (backend / edge)

```bash
# runtime
yarn add pino pino-http express cors dotenv zod uuid axios knex \
  graphql graphql-yoga graphql-tag prom-client

# DB driver (pick one)
yarn add pg                  # central
yarn add sqlite3             # edge

# tooling
yarn add -D typescript tsx tsc-alias tsconfig-paths rimraf cross-env copyfiles \
  vitest @vitest/coverage-v8 \
  eslint @eslint/js typescript-eslint eslint-plugin-import eslint-plugin-n eslint-plugin-promise globals \
  prettier pino-pretty \
  husky lint-staged @commitlint/cli @commitlint/config-conventional \
  @types/node @types/express
```

## Do not swap casually

| Avoid for new repos | Prefer |
|---------------------|--------|
| winston / bunyan as primary logger | **pino** |
| jest as default test runner | **vitest** |
| No hooks / no lint on commit | **husky** + **lint-staged** |
| Ad-hoc `console.log` in services | structured **pino** logger |
| ESLint v8 legacy + random plugins | flat config + typescript-eslint |
