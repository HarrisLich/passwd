# Repo map

```
passwd/                          # npm workspaces monorepo (single git root)
├── package.json                 # workspaces + root scripts
├── AGENTS.md                    # agent instructions
├── .cursor/
│   ├── skills/                  # committed skills for all agents
│   │   ├── passwd-architecture/
│   │   ├── passwd-zero-knowledge/
│   │   ├── passwd-crypto/
│   │   ├── passwd-sync/
│   │   ├── passwd-extension/
│   │   ├── hallmark/
│   │   └── architecture-blueprints/
│   └── rules/
│       ├── passwd-agents.mdc    # alwaysApply
│       └── hallmark.mdc
├── docs/
├── passwd-crypto/               # shared client crypto library
├── passwd-server/               # Workers + Hono + Turso
├── passwd-svelte/               # SvelteKit UI
├── passwd-extension/            # WXT extension
└── passwd-desktop/              # Tauri wrapper (points at svelte)
```

Packages stay separate ownership trees; the monorepo only unifies install, scripts, git, and agent skills.
