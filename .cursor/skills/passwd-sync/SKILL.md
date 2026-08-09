---
name: passwd-sync
description: >-
  Vault blob sync protocol for Passwd — pull-by-cursor, last-write-wins, and
  conflict UX. Use when implementing sync endpoints, client sync modules, or
  conflict resolution.
---

# Passwd Sync

## Model

Each vault item = encrypted blob + metadata:

| Field | Server | Client |
|-------|--------|--------|
| `id` | yes | yes |
| `ciphertext` / envelope | yes (opaque) | decrypt locally |
| `updated_at` | yes | yes |
| `version` | yes (monotonic per item) | yes |
| `deleted_at` | soft-delete | tombstone |

## Protocol (v1)

1. Client stores `last_sync_at` (or sync token)
2. `GET /v1/sync?since=<iso>` → blobs newer than cursor
3. Client decrypts, merges into local store
4. Local creates/updates → `PUT /v1/items/:id` with envelope + client `updated_at`
5. Conflicts: **last-write-wins** by `updated_at`; if equal, higher `version` wins
6. Optional later: merge UI when both sides changed different decrypted fields

## Rules

- Server never inspects ciphertext contents
- Idempotent upserts by item `id`
- Soft deletes sync as tombstones so other devices purge
- Authz: session user can only touch their vault rows
- Keep payloads small; no full-vault rewrite required at small scale

## Code homes

- Server: `passwd-server/src/modules/sync`
- Client: `passwd-svelte/src/lib/modules/sync`
- Extension: trigger sync via messaging to shared logic / API client
