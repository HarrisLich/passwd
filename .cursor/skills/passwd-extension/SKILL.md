---
name: passwd-extension
description: >-
  WXT browser extension conventions for Passwd autofill, content scripts, and
  secure messaging. Use when working in passwd-extension or designing autofill.
---

# Passwd Extension

Framework: **WXT** (MV3). Reuse `passwd-crypto` and the same API contracts as `passwd-svelte`.

## Entrypoints

```
passwd-extension/
├── entrypoints/
│   ├── background/     # service worker — session, sync triggers, message hub
│   ├── content/        # form detection + fill (no master key in page world)
│   ├── popup/          # unlock + item pick UI
│   └── options/        # settings
├── lib/
│   ├── messaging/      # typed message protocol
│   ├── autofill/       # field heuristics
│   └── crypto/         # wraps passwd-crypto; keys stay in background/offscreen
```

## Security rules

1. Never inject `K_vault` or master password into the page JS world
2. Content script asks background for fill payloads for the current origin only
3. Prefer user gesture before fill
4. Lock clears in-memory keys in the service worker
5. Autofill heuristics stay in `lib/autofill` — not inline in content script soup

## Messaging

Use a typed discriminated union (`type` + `payload`). Validate with zod at the boundary. Reject unknown message types.

## Do not

- Duplicate encryption algorithms outside `passwd-crypto`
- Store vault plaintext in `chrome.storage.sync`
- Skip origin checks on fill requests
