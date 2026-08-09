---
name: passwd-crypto
description: >-
  Client-side cryptography package conventions for passwd-crypto using
  libsodium-wrappers and Argon2id. Use when encrypting vault items, deriving
  keys, combining Secret Key, or wiring crypto into svelte/extension/desktop.
---

# Passwd Crypto

Package: `passwd-crypto` — browser/extension/desktop only. Never import into `passwd-server` for vault decryption.

## Stack

| Job | Library |
|-----|---------|
| AEAD | `@noble/ciphers` — XChaCha20-Poly1305 |
| KDF | `hash-wasm` Argon2id (WASM) |
| Key mix | `@noble/hashes` Blake2b (keyed) |
| Random | `crypto.getRandomValues` |
| Validation | zod for envelope schemas |

## Module map

```
passwd-crypto/src/
├── kdf/argon2id.ts       # derive key from password + salt + params
├── keys/secret-key.ts    # generate / normalize / combine with K_mp
├── keys/dual-derive.ts   # separate enc vs auth material
├── cipher/xchacha.ts     # encrypt / decrypt item payloads
├── types/envelope.ts     # ciphertext envelope schema
└── index.ts
```

## Envelope (wire + DB shape)

Opaque to server. Suggested fields:

```ts
{
  v: 1,                    // schema version
  alg: 'xchacha20poly1305',
  nonce: string,           // base64
  ciphertext: string,      // base64
  // optional: kdf hint ids — never the key
}
```

## Rules

1. All vault encrypt/decrypt goes through this package
2. Prefer constant-time compare helpers from sodium for auth material
3. Wipe sensitive `Uint8Array` buffers when APIs allow
4. Unit-test round-trip + wrong-key failure in `__tests__`
5. Do not log nonces+ciphertext together with user identifiers in client analytics

## Consumers

- `passwd-svelte` → `lib/infra/crypto` thin re-export / init
- `passwd-extension` → `lib/crypto`
- `passwd-desktop` → same UI bundle / shared package
