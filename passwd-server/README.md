# passwd-server

Hono API with **Better Auth** sessions and **Turso/libsql** storage. Stores ciphertext + metadata only.

## Auth model

Session login uses a **client-derived auth password** (Argon2id auth path), never the master password / `K_vault`.

| Route | Purpose |
|-------|---------|
| `POST /api/auth/sign-up/email` | Register (`email`, `password`=auth secret, `name`, `kdfParams`) |
| `POST /api/auth/sign-in/email` | Session login |
| `GET /api/auth/get-session` | Current session |
| `GET /v1/me` | Profile + public `kdfParams` (session required) |
| `GET /v1/sync` | Pull ciphertext blobs (session required) |
| `PUT /v1/vault/items/:id` | Upsert envelope (session required) |

## Local dev (file DB)

```bash
cp .env.example .env
mkdir -p .data
npm install --legacy-peer-deps
npm run db:push
npm run dev
# → http://localhost:8787
```

## Turso Cloud / Workers

Local dev uses a `file:` SQLite DB, which **cannot exist in production** — Cloudflare Workers has no persistent filesystem. Production needs a real hosted Turso database:

1. Sign up at [app.turso.tech](https://app.turso.tech) (free tier is enough) and create a database.
2. From the dashboard, copy the database URL (`libsql://...`) and generate an auth token.
3. Push the schema to it: `TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:push`.
4. When you're ready to actually deploy: `wrangler login`, then `wrangler secret put TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `SESSION_SECRET` (values piped in, not typed — they're secrets), then `npm run deploy`. `npm run dev:edge` runs the Worker locally against whatever `TURSO_DATABASE_URL` is set.

Because Turso is a persistent hosted DB (not tied to the Worker's own lifecycle), data survives every redeploy automatically — the schema only needs pushing again if it changes.

### Syncing data between local dev and production

Local dev and production are **separate databases on purpose** — local testing can't corrupt real data. To move data between them on demand:

1. Add `PROD_TURSO_DATABASE_URL` / `PROD_TURSO_AUTH_TOKEN` to your local `.env` (see `.env.example`) — the same values from step 2 above. These are read only by the sync script below, never by the dev server itself.
2. ```bash
   npm run db:pull        # production -> local (overwrites local)
   npm run db:push-data   # local -> production (overwrites production!)
   ```
   Both print a row-count summary from the source and require typing `yes` to confirm before touching anything (pass `-- --yes` to skip the prompt for scripted use). This is a **full replace**, not a merge — the target database is wiped and replaced entirely with the source's data. `scripts/db-sync.ts` has the details (table order, transaction handling).
