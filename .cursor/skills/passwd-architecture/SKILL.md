---
name: passwd-architecture
description: >-
  Passwd monorepo architecture, package ownership boundaries, and scaffolding rules for
  passwd-svelte, passwd-server, passwd-crypto, passwd-extension, and passwd-desktop.
  Use when adding features, choosing which package owns work, scaffolding modules,
  reviewing cross-package contracts, or starting new Passwd packages.
---

# Passwd Architecture

Zero-knowledge password manager. Server stores ciphertext + metadata only. Encryption keys never leave the client.

This is an **npm workspaces monorepo**. Packages stay separate trees under `passwd-*` — do not merge UI + API + crypto into one package.

## Packages (naming: `passwd-*`)

| Package | Blueprint | Owns | Does not own |
|---------|-----------|------|--------------|
| `passwd-crypto` | shared library | Argon2id KDF, XChaCha20-Poly1305, Secret Key combine, dual auth/enc key derivation, sealed-box wrapping | UI, network, DB |
| `passwd-server` | central API (adapted: Hono + Workers + Turso) | sessions, auth proofs, ciphertext blob CRUD, sync versions, sharing metadata, WebAuthn credentials | plaintext, vault keys, item contents |
| `passwd-svelte` | SvelteKit frontend | routes, unlock UX, vault UI, client sync orchestration, Hallmark design | inventing API shapes, server crypto |
| `passwd-extension` | WXT WebExtension | autofill, content scripts, popup unlock bridge | vault business rules (reuse crypto + API client) |
| `passwd-desktop` | Tauri shell | native window, secure storage hooks, wraps `passwd-svelte` | duplicate vault logic |

## Stack locks

- **Client crypto**: `@noble/*` / sealed box + WASM Argon2id (`hash-wasm`)
- **API**: Cloudflare Workers + Hono + Turso/libsql
- **Session auth**: Better Auth (or JWT+refresh) — proves session only; separate from vault unlock
- **Optional 2FA unlock**: WebAuthn via `@simplewebauthn/*`
- **Frontend**: SvelteKit 5 + TS + Tailwind + `@sveltejs/adapter-cloudflare`
- **Design**: Hallmark ([usehallmark.com](https://www.usehallmark.com/)) — required for greenfield UI
- **Tooling defaults**: typescript strict, zod, vitest, eslint, prettier, husky, lint-staged, commitlint, pino (server)
- **Monorepo**: npm workspaces from repo root

## Layering (every package)

1. Thin transport (routes / content scripts)
2. Services / modules own behavior
3. Repositories own persistence (server only)
4. Infra = adapters (db, http, auth, logging)
5. Contracts explicit — `passwd-svelte` / extension consume server types; do not invent fields

## Where to put new work

| Change | Package + path |
|--------|----------------|
| Encrypt/decrypt item | `passwd-crypto` then wire from `passwd-svelte` / extension |
| Sync pull/push API | `passwd-server` `modules/sync` + client `lib/modules/sync` |
| Unlock / master password UX | `passwd-svelte` `routes/auth/unlock` + `modules/unlock` |
| Autofill | `passwd-extension` `lib/autofill` |
| Session login (account) | `passwd-server` `modules/auth` + svelte `infra/auth` |
| Marketing / landing UI | `passwd-svelte` + Hallmark |

## Hard rules

- If a feature needs the server to see plaintext passwords or the vault key → **stop and redesign**
- Prefer extending an existing module over creating parallel `utils/` / `helpers/` trees
- Use architecture-blueprints folder layout; adapt Express/GraphQL → Hono REST for `passwd-server`
- Frontend GraphQL defaults from blueprints do **not** apply — use typed REST/fetch under `lib/infra/api`

## Scaffold checklist

```
Passwd scaffold:
- [ ] Package selected (crypto / server / svelte / extension / desktop)
- [ ] Ownership boundary stated in AGENTS.md
- [ ] Blueprint tree created (adapted for stack)
- [ ] Default libraries applied
- [ ] First domain module stubbed
- [ ] Zero-knowledge invariant checked
- [ ] Hallmark used for any greenfield UI (svelte)
```

## Related skills (all under `.cursor/skills/`)

- `passwd-zero-knowledge` — crypto/auth threat model and data flow
- `passwd-crypto` — how to use the shared crypto package
- `passwd-sync` — blob sync + conflict rules
- `passwd-extension` — WXT / autofill constraints
- `hallmark` — UI design (required for svelte greenfield)
- `architecture-blueprints` — folder templates (in-repo)
