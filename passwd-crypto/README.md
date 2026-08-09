# passwd-crypto

Client-side cryptography for Passwd.

| Primitive | Library |
|-----------|---------|
| Argon2id | `hash-wasm` |
| XChaCha20-Poly1305 | `@noble/ciphers` |
| Secret Key mix | keyed Blake2b (`@noble/hashes`) |

```bash
npm install
npm test
```

Never import into `passwd-server` for vault decryption.
