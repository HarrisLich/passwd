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

Set `TURSO_DATABASE_URL=libsql://...` + `TURSO_AUTH_TOKEN`, run `npm run db:push`, then:

```bash
npm run dev:edge   # wrangler
# or
npm run deploy
```
