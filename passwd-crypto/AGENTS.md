# passwd-crypto

Owns client-side vault cryptography only.

- Argon2id key derivation
- Secret Key generation / combination
- Dual derive (encryption vs auth material)
- XChaCha20-Poly1305 item envelopes

Does **not** own UI, HTTP, or database access. Never import this package into `passwd-server` for decrypting user vaults.

See workspace skill `passwd-crypto` and `passwd-zero-knowledge`.
