# passwd-server

Central API (architecture-blueprints **central backend**, adapted):

| Blueprint default | Passwd adaptation |
|-------------------|-------------------|
| Express + GraphQL | Hono REST on Cloudflare Workers / Node local |
| PostgreSQL + Knex | Turso / libsql via Drizzle |
| Business plaintext | **Ciphertext blobs only** |
| Custom auth | **Better Auth** session layer |

## Owns

- Better Auth registration / session cookies
- Public KDF params on `user.kdf_params`
- Vault item blob CRUD + sync cursor
- Request logging without decryptable secrets

## Does not own

- Master password, Secret Key, `K_vault`
- Item plaintext or client-side unlock UX

## Layout

```
src/
├── index.ts
├── core/
├── app/routes/
├── modules/{vault,sync,webauthn}/
└── infra/{db,auth,observability}/
```

Auth transport is Better Auth at `/api/auth/*` — do not reintroduce password handling in custom routes that accepts master passwords.
