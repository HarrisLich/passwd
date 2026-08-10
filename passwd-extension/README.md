# passwd-extension

WXT MV3 browser extension for Passwd: popup unlock, inline autofill suggestions, password generation, and save/update prompts. Reuses `passwd-crypto` and the same `passwd-server` API contracts as `passwd-svelte` — see workspace skill `passwd-extension` and `docs/data-flow.md` at the repo root.

## Setup

```bash
# From repo root
npm install --legacy-peer-deps

# Generates .wxt/ (gitignored) — required once before typecheck/editor tooling works
npx wxt prepare -w passwd-extension
```

The server needs to trust the extension's origin for session cookies to work (see "Server config" below) before unlock will succeed.

## Dev

```bash
npm run dev -w passwd-extension
```

Load the unpacked build (`.output/chrome-mv3` while `wxt dev` is running) via `chrome://extensions` → Developer mode → Load unpacked.

## Server config (local dev)

A `chrome-extension://<id>` origin is cross-site to `passwd-server`, so it needs an explicit allowlist entry and a `SameSite=None` cookie (see `passwd-server/src/infra/auth/better-auth.ts`):

1. Generate a stable dev extension key so the id doesn't change every reload, and set it before running `wxt dev`:
   ```bash
   export WXT_EXTENSION_DEV_KEY="<base64 RSA public key>"
   ```
2. Load the unpacked extension once, note the id shown in `chrome://extensions`.
3. In `passwd-server/.env`, set `EXTENSION_ORIGIN=chrome-extension://<id>` and restart `npm run dev:server`.

Leave `EXTENSION_ORIGIN` unset in production — it only relaxes CORS/cookie behavior when explicitly configured.

## Layout

```
entrypoints/
├── background/   # service worker — owns the vault key, dispatches lib/messaging/router
├── content/      # form detection + shadow-DOM UI (suggestion chip, generator popover, save prompt)
├── popup/        # unlock + vault list (vanilla TS, no framework)
└── options/      # API base URL + autofill toggle
lib/
├── messaging/    # zod-validated request/response protocol + router + client
├── session/      # vault key + identity (in-memory, shadowed into chrome.storage.session)
├── vault/        # sync/decrypt/save vault items, same-registrable-domain matching (tldts)
├── autofill/     # field detection, form classification, React-safe fill
├── generator/    # crypto.getRandomValues password generator + recall history
├── save-detection/ # submission capture + save/update prompt state machine
└── api/          # passwd-server client, mirrors passwd-svelte's infra/api
```

## Scope (this pass)

Sign-in/unlock only — account signup happens in `passwd-svelte`. Autofill domain matching is same-registrable-domain (via `tldts`'s Public Suffix List parsing) — a saved `google.com` matches `accounts.google.com`, but not an unrelated domain like `gmail.com` (no path-restricted/"anywhere" rules, and no cross-domain identity-provider alias list, yet). No TOTP, passkeys, or non-login item types. See `TODO.md` at the repo root for what's next.

## Tests

```bash
npm run test -w passwd-extension
```

Covers `lib/autofill`, `lib/generator`, and `lib/messaging/protocol`. The unlock/autofill/save-prompt flows themselves are manual/browser-only for now.
