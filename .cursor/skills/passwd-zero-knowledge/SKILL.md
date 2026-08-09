---
name: passwd-zero-knowledge
description: >-
  Zero-knowledge vault threat model, key hierarchy, and signup→encrypt→sync data
  flow for Passwd. Use when implementing auth, unlock, encryption, Secret Key,
  SRP/auth-hash derivation, or reviewing whether the server can see secrets.
---

# Passwd Zero-Knowledge

## Invariant

A fully compromised server (DB + Workers + session secrets) must not yield vault plaintext or a decryptable key. Session auth ≠ vault unlock.

## Key hierarchy

```
Master password ─┬─ Argon2id(salt_enc, params) → K_mp
                 │
Secret Key ──────┴─ combine(K_mp, SecretKey) → K_vault   # never leaves client
                                                         # encrypts items (XChaCha20-Poly1305)

Master password ── Argon2id(salt_auth, params) → K_auth  # or SRP verifier
                                                         # server stores verifier/hash only
                                                         # useless for decrypting vault
```

- **Secret Key**: high-entropy client-generated value; shown once at signup; never uploaded
- **Salts / Argon2 params**: may be stored server-side (public)
- **Item ciphertext**: blob + nonce + version + updated_at — no AAD that leaks secrets

## Data flow (happy path)

1. **Signup** — client generates Secret Key + salts; derives `K_vault` + auth verifier; registers account with verifier + public crypto params; creates empty vault metadata
2. **Login (session)** — prove knowledge of auth material (SRP or auth-hash); receive session cookie/JWT; vault still locked
3. **Unlock** — user enters master password (+ Secret Key if required); derive `K_vault` in memory only
4. **Create item** — serialize plaintext JSON → encrypt with `K_vault` → POST ciphertext blob
5. **Sync** — GET blobs with `updated_at > cursor`; decrypt locally; LWW or merge UI on conflicts
6. **Lock** — wipe `K_vault` from memory; session may remain

## Server may store

- User id, email (or opaque login id)
- Auth verifier / SRP verifier
- KDF salts + params
- Encrypted vault item blobs + ids + timestamps + sync version
- WebAuthn credential public keys (optional)

## Server must never store or receive

- Master password
- Secret Key
- `K_vault` / `K_mp`
- Item plaintext
- Decrypted item fields in logs

## Review checklist

- [ ] No API accepts plaintext vault fields
- [ ] Logging redacts blobs or treats them as opaque
- [ ] Client memory wipe on lock/logout documented
- [ ] Auth key material cannot decrypt vault items
- [ ] Extension/desktop use `passwd-crypto`, not a second crypto path

See also: [docs/data-flow.md](../../../docs/data-flow.md)
