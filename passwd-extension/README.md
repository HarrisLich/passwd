# passwd-extension

WXT MV3 browser extension for Passwd: popup unlock, inline autofill suggestions, password generation, and save/update prompts. Reuses `passwd-crypto` and the same `passwd-server` API contracts as `passwd-svelte` — see workspace skill `passwd-extension` and `docs/data-flow.md` at the repo root.

## Setup

```bash
# From repo root
npm install --legacy-peer-deps

# Generates .wxt/ (gitignored) — required once before typecheck/editor tooling works
npx wxt prepare -w passwd-extension
```

The extension talks to the **deployed production `passwd-server`** by default (`lib/api/config.ts`'s `DEFAULT_API_BASE`) — no server setup needed to just use it. Building from a clean clone reproduces the exact same `chrome-extension://<id>` every time (`.env.local`'s `WXT_EXTENSION_DEV_KEY` is committed on purpose — see its own comment), and production's `EXTENSION_ORIGIN` already trusts that id, so a fresh build on any machine just works.

## Dev

```bash
npm run dev -w passwd-extension
```

Load the unpacked build (`.output/chrome-mv3` while `wxt dev` is running) via `chrome://extensions` → Developer mode → Load unpacked.

## Pointing at a local passwd-server instead of production

Open the extension's Options page and set the API base URL to `http://127.0.0.1:8787` (persisted in `chrome.storage.local`, overrides the production default). The local server then also needs to trust the extension's origin — a `chrome-extension://<id>` origin is cross-site to `passwd-server`, so it needs an explicit allowlist entry and a `SameSite=None` cookie (see `passwd-server/src/infra/auth/better-auth.ts`):

1. In `passwd-server/.env`, set `EXTENSION_ORIGIN=chrome-extension://jkhobgfeakjblkamfhebekmmcpffkond` (the id derived from the committed dev key — same one production already trusts) and restart `npm run dev:server`.

`EXTENSION_ORIGIN` is also set on the deployed Worker (`passwd-server/wrangler.toml`'s `[vars]`) for the same reason, to the same id.

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
