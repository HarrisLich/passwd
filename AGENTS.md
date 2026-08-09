# Passwd — agent instructions

## Product

Zero-knowledge password manager. Server stores **ciphertext blobs + metadata** only.

## Monorepo packages

Work in the matching `passwd-*` package. Do not collapse UI + API + crypto into one package tree.

| Need | Package |
|------|---------|
| Encrypt / KDF / Secret Key | `passwd-crypto` |
| HTTP API, Turso, sessions | `passwd-server` |
| Web UI / unlock / vault screens | `passwd-svelte` |
| Autofill / content scripts | `passwd-extension` |
| Native desktop shell | `passwd-desktop` |

Root uses **npm workspaces**. From the repo root: `npm install`, then `npm run dev:server` / `npm run dev:web`.

## Skills to load

All skills live in-repo under `.cursor/skills/` (committed so any agent/clone can use them):

1. `.cursor/skills/passwd-architecture` — always for cross-cutting work
2. `.cursor/skills/passwd-zero-knowledge` — any auth/crypto/unlock/sync feature
3. Domain skill (`passwd-crypto`, `passwd-sync`, `passwd-extension`) as needed
4. `.cursor/skills/hallmark` — any greenfield or redesign UI in `passwd-svelte`
5. `.cursor/skills/architecture-blueprints` — when scaffolding modules/trees
6. Svelte skills / MCP — when editing `.svelte` files

Also see `.cursor/rules/passwd-agents.mdc` (always applied) and `.cursor/rules/hallmark.mdc`.

## Non-negotiables

- Never send master password, Secret Key, or `K_vault` to the server
- Never decrypt vault items on the server
- Prefer blueprint layering: routes thin → modules/services → repos/infra
- Conventional commits; husky/lint-staged where configured
- Do not invent API fields — extend `passwd-server` contracts first

## Hallmark

In-repo skill: `.cursor/skills/hallmark`. Optional global install: `npx skills add nutlope/hallmark -g -y`  
Docs: https://www.usehallmark.com/

When building UI: run Hallmark design flow (theme + macrostructure + tokens). No purple-gradient heroes, no Inter-as-display, no centered-everything defaults.
