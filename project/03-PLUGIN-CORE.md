# 03 - Plugin Core

> **Use this prompt to create the `@claudeforge/forge-plugin` package core modules.**
> **This package must have NO external dependencies (except shared types).**

---

## Package Structure

```
packages/plugin/
├── .claude-plugin/
│   └── plugin.json
├── src/
│   ├── core/
│   │   ├── state.ts         # State read/write
│   │   ├── criteria.ts      # Criteria evaluation
│   │   └── summary.ts       # Iteration summary
│   ├── strategies/
│   │   ├── stuck.ts         # Stuck detection
│   │   └── recovery.ts      # Recovery strategies
│   ├── checkpoints/
│   │   └── manager.ts       # Checkpoint operations
│   ├── sync/
│   │   └── webhook.ts       # Control center sync
│   ├── hooks/
│   │   └── stop.ts          # MAIN STOP HOOK
│   └── utils/
│       ├── transcript.ts    # Transcript parsing
│       ├── shell.ts         # Shell execution
│       ├── git.ts           # Git operations
│       └── cost.ts          # Cost estimation
├── commands/                # (in 04-PLUGIN-COMMANDS.md)
├── hooks/
│   └── hooks.json
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## Package Config

### package.json

```json
{
  "name": "@claudeforge/forge-plugin",
  "version": "0.1.0",
  "description": "FORGE Plugin for Claude Code - Iterative AI Development Engine",
  "type": "module",
  "main": "./dist/hooks/stop.js",
  "scripts": {
    "build": "tsup && chmod +x dist/hooks/stop.js",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@claudeforge/forge-shared": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

---

## Utils

### src/utils/shell.ts

For running shell commands. **NO external dependencies.**

### src/utils/transcript.ts

For parsing Claude Code transcript.

### src/utils/git.ts

For git operations (checkpoints).

### src/utils/cost.ts

Token and cost estimation.

---

## Core Modules

### src/core/state.ts

State file management.

### src/core/criteria.ts

Criteria evaluation engine.

### src/core/summary.ts

Iteration summary generation.

---

## Strategies

### src/strategies/stuck.ts

Stuck detection algorithms.

### src/strategies/recovery.ts

Recovery strategies from stuck state.

---

## Checkpoints

### src/checkpoints/manager.ts

Checkpoint creation and restoration.

---

## Main Stop Hook

### src/hooks/stop.ts

**This file is the HEART of FORGE.** This hook is triggered every time Claude tries to exit.

---

## Build

```bash
cd packages/plugin
pnpm install
pnpm build

# Check executable
ls -la dist/hooks/stop.js
```

---

## Next Step

Move to `04-PLUGIN-COMMANDS.md`.
