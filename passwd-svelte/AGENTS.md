# passwd-svelte

SvelteKit frontend (architecture-blueprints **frontend-sveltekit**).

## Owns

- Routes / unlock / vault UI
- Client sync orchestration
- Session UX (not vault key derivation details — those live in `passwd-crypto`)
- Hallmark design tokens + marketing surfaces

## Does not own

- Server schemas, Turso, inventing API fields
- Second crypto implementation (import `passwd-crypto`)

## Layout

```
src/routes/           # pages (thin)
src/lib/components/   # ui + feature UI
src/lib/modules/      # feature logic
src/lib/infra/        # api, auth, crypto bridge, logging
```

## Design

Use **Hallmark** for greenfield UI. Current marketing stamp: Cobalt · Marquee Hero (see `src/lib/styles/tokens.css`).
