# Passwd — backlog

Living list of improvements. Check items off as they ship; add new ones at the bottom of the right section.

## Now / next

- [ ] Revocation + key rotation on shared vaults (re-encrypt items, re-wrap for remaining members)
- [ ] Migrate legacy items to item keys in bulk (UI: “Upgrade for sharing” or auto on first share)
- [ ] Vault-level share inheritance polish (ensure editors always receive wraps for new items)
- [ ] Share management UI (list / revoke recipients, change access level)

## Later

- [ ] **Pending invites** for users who don’t have an account yet (email invite → placeholder → claim keypair on signup). Skipped for now; needed for non-technical staff handoffs.
- [ ] Vault item types beyond login (secure notes, cards, etc.)
- [ ] Browser extension autofill (`passwd-extension`) wired to shared crypto + session
- [ ] Tauri desktop shell (`passwd-desktop`)
- [ ] WebAuthn / passkey as optional unlock factor
- [ ] Conflict merge UI beyond last-write-wins
- [ ] Turso Cloud + `wrangler` edge deploy path (swap off local `file:` DB)
- [ ] Account recovery / emergency kit export (Secret Key + account details)

## Done (recent)

- [x] Zero-knowledge signup / unlock (Argon2id dual-derive + Secret Key)
- [x] Better Auth sessions + Turso/libsql persistence
- [x] Encrypted vault item CRUD + sync
- [x] Vite same-origin API proxy (fix localhost vs 127.0.0.1 cookie bounce)
- [x] Asymmetric key wrapping (X25519 / sealed box) + identity keypair on unlock/signup
- [x] Item-level keys + `item_shares` (select which accounts to share)
- [x] Vault-level grants (`vault_shares`) with fan-out wraps + inheritance on new items
- [x] Groups with group keypairs (double-wrapping)
- [x] Access-level checks (viewer | editor | manager | owner) on share / mutation paths
- [x] Invite existing user by email → fetch public key → client wrap → upload
