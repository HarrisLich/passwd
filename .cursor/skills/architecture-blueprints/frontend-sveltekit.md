# SvelteKit Frontend Blueprint

Derived from `corebita-svelte` (SvelteKit + Vite operator/client UI).

Use for: web frontends that consume GraphQL/REST backends, feature-oriented UI, multi-target API clients (e.g. central vs edge).

Apply shared defaults from [default-libraries.md](default-libraries.md) where applicable (eslint, prettier, vitest, zod, husky/commitlint for new apps) plus the frontend stack below.

## Responsibility

Owns:

- Routes and screens
- Presentation components and UI primitives
- Client-side feature modules (pure logic / controllers)
- GraphQL/REST client adapters
- Auth session UX and loading/error states

Does not own:

- Backend business rules
- Database schemas
- Invented API fields or payload shapes

Backend contracts are source of truth. If a contract is missing, surface it — do not silently invent workarounds.

## Root tree

```
app-name/
├── AGENTS.md
├── package.json
├── svelte.config.js
├── vite.config.js
├── tsconfig.json
├── tailwind.config.js          # if using Tailwind
├── vitest.config.ts
├── eslint.config.js            # or flat config equivalent
├── .prettierrc
├── .husky/                     # recommended for new apps
├── playwright.config.*         # optional e2e
├── static/
└── src/
    ├── app.html
    ├── app.css / app.pcss
    ├── hooks.server.ts         # optional
    ├── routes/                 # SvelteKit file-based routes
    └── lib/
        ├── components/         # UI by feature + shared ui/
        ├── modules/            # feature logic (non-Svelte TS)
        ├── infra/              # auth, graphql clients, logging
        ├── stores/             # shared client state
        └── types/              # shared TS types
```

## Layer map

| Path | Owns | Do not put here |
|------|------|-----------------|
| `src/routes/` | Pages, layouts, loaders, thin route actions | Heavy business logic, ad-hoc fetch sprawl |
| `src/lib/components/ui/` | Design-system primitives (button, dialog, table, …) | Domain rules |
| `src/lib/components/<feature>/` | Feature UI composition | Transport clients |
| `src/lib/modules/<feature>/` | Controllers, pure helpers, feature algorithms | Svelte markup |
| `src/lib/infra/` | Auth, GraphQL/REST adapters, logging | UI components |
| `src/lib/stores/` | Cross-route client state | Server secrets |
| `src/lib/types/` | Shared types | Runtime side effects |

### Recommended `infra/` split

```
src/lib/infra/
├── auth/
├── logging/
└── graphql/
    ├── adapters/           # urql/fetch clients, link setup
    ├── core/               # queries + mutations for central API
    │   ├── queries/
    │   └── mutations/
    ├── <edge>/             # queries + mutations for edge API (if any)
    │   └── mutations/
    └── scripts/            # schema sync / codegen helpers
```

When the product talks to **more than one backend**, isolate clients by target (`core/` vs `pod/`). Never mix base URLs casually inside components.

## Feature vertical slice

For a new feature (example: datamap):

```
src/routes/<area>/...                 # pages
src/lib/components/<area>/...         # UI
src/lib/modules/<feature>/...         # logic + tests
src/lib/infra/graphql/<target>/...    # operations
```

Rules:

- Routes compose components and call modules/infra
- Components render and emit events; prefer modules for non-trivial logic
- Colocate `__tests__` next to modules/components under test
- Reuse `components/ui/*` before inventing new primitives

## Routing conventions

- File-based SvelteKit routes under `src/routes`
- Dynamic segments: `[id]/`, nested feature folders
- Keep `+page.svelte` focused; move complexity to `lib/modules` / components
- Use `+layout.*` for shared chrome (sidebar, auth gates)
- Prefer explicit loading and error UI for network-bound views

## Data integration rules

1. Prefer existing helpers under `lib/infra/graphql/` over ad-hoc `fetch`
2. Do not hardcode backend fields that are not in the schema
3. After mutations that change remote ids/lists, re-fetch lists
4. If UI work depends on a missing backend contract, stop and call that out
5. Keep presentation separate from transport

## Default stack (install these)

Adjust only with reason:

| Concern | Default |
|---------|---------|
| App | **svelte@5**, **@sveltejs/kit**, **vite** |
| Language | **typescript** (strict), `@tsconfig/svelte` |
| GraphQL | **@urql/core**; **houdini** / houdini-svelte if codegen |
| Validation | **zod** |
| HTTP | **axios** when REST is needed |
| CSS | **tailwindcss**, postcss, autoprefixer |
| UI | bits-ui, clsx, tailwind-merge, cva, lucide-svelte, svelte-sonner |
| Lint/format | eslint, eslint-plugin-svelte, eslint-config-prettier, prettier, prettier-plugin-svelte |
| Check | **svelte-check** |
| Tests | **vitest**; **@playwright/test** for e2e |
| Git hooks (new apps) | **husky**, **lint-staged**, **commitlint** |
| Adapter | per host (`adapter-vercel`, node, static, …) |

Useful scripts to mirror:

- `dev`, `build`, `preview`, `check` (`svelte-check`)
- `lint` / `format`
- `test` / `test:e2e`
- `prepare` — `husky` (for new frontends)
- `generate` for schema sync + client codegen (if used)

## UI composition rules

- Prefer small composable components
- Avoid mega-components that mix fetch + state + markup
- Preserve existing navigation/loading/error patterns unless redesign is requested
- Shared chrome (sidebar/layout) stays in layout/components, not duplicated per page

## Extension checklist

1. Identify the user flow / route
2. Identify the backend contract and target (central vs edge)
3. Add/extend infra operations first (or flag missing contract)
4. Put logic in `lib/modules/<feature>/`
5. Compose UI in `lib/components/<feature>/` + route page
6. Validate with `check` / focused tests / smoke e2e as appropriate

## Anti-patterns

- Fetching GraphQL directly inside deep presentational components when an infra helper exists
- Duplicating types that already come from generated/schema sources
- Building a second `services/` tree that bypasses `infra/` + `modules/`
- Encoding backend orchestration in the UI (e.g. implying definition-sync creates gold rows)
