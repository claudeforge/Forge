# FORGE - Master Project Document

> **This is the main prompt file to be given to Claude Code.**
> **Use this file as reference to apply all other prompt files in order.**

---

## Project Identity

| Field | Value |
|-------|-------|
| **Project Name** | FORGE - Iterative AI Development Engine |
| **GitHub Org** | github.com/claudeforge |
| **NPM Scope** | @claudeforge |
| **Main Repo** | github.com/claudeforge/forge |
| **License** | MIT |
| **Domain** | claudeforge.dev |

---

## Project Purpose

FORGE is an advanced iterative development engine for Claude Code. It replaces the current "Ralph Wiggum" approach with a production-grade system.

### Ralph vs FORGE Comparison

| Feature | Ralph Wiggum | FORGE |
|---------|--------------|-------|
| Completion Detection | Single string match | Multi-criteria, weighted scoring |
| Progress Tracking | Only iteration count | Detailed metrics |
| Error Handling | Terminates loop | Intelligent retry, recovery |
| Checkpoints | None | Automatic + manual |
| Rollback | None | Return to checkpoint |
| Cost Control | None | Budget limits |
| Time Control | None | Duration limits |
| Stuck Detection | None | Pattern-based detection |
| External Monitoring | None | Web dashboard |
| Task Queue | None | Priority queue + scheduling |
| Implementation | Bash | TypeScript |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FORGE CONTROL CENTER                          │
│                  (Node.js + React Dashboard)                     │
│                      http://localhost:3344                       │
│                                                                  │
│   📊 Dashboard    │    📋 Task Queue    │    📈 Analytics       │
└────────────────────────────┬────────────────────────────────────┘
                             │
              Webhooks ↑     │     ↓ Claude CLI
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                                                                  │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│    │  Project A   │    │  Project B   │    │  Project C   │    │
│    │              │    │              │    │              │    │
│    │ ┌──────────┐ │    │ ┌──────────┐ │    │ ┌──────────┐ │    │
│    │ │  FORGE   │ │    │ │  FORGE   │ │    │ │  FORGE   │ │    │
│    │ │  Plugin  │ │    │ │  Plugin  │ │    │ │  Plugin  │ │    │
│    │ └──────────┘ │    │ └──────────┘ │    │ └──────────┘ │    │
│    │              │    │              │    │              │    │
│    │ Claude Code  │    │ Claude Code  │    │ Claude Code  │    │
│    └──────────────┘    └──────────────┘    └──────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Two Main Components

1. **FORGE Plugin** (`@claudeforge/forge-plugin`)
   - Plugin loaded into Claude Code
   - Creates iteration loop with Stop Hook
   - Evaluates completion criteria
   - Stuck detection and recovery
   - Checkpoint management
   - Sends webhooks to Control Center

2. **FORGE Control Center** (`@claudeforge/forge-server` + `@claudeforge/forge-web`)
   - Standalone Node.js server + React web interface
   - Monitors multiple projects
   - Task queue and scheduling
   - Real-time dashboard
   - Analytics and cost tracking

---

## Technology Decisions

| Area | Technology | Why? |
|------|-----------|------|
| **Monorepo** | pnpm + Turborepo | Fast, cache, parallel builds |
| **Language** | TypeScript (strict) | Type safety |
| **Plugin Build** | tsup | Zero-config, fast, ESM+CJS |
| **Server** | Hono | Ultra-fast, edge-ready |
| **Database** | SQLite + Drizzle ORM | Zero-config, portable |
| **Web** | React 19 + Vite | Modern, fast |
| **Styling** | Tailwind CSS | Utility-first |
| **State** | TanStack Query | Server state management |
| **Routing** | TanStack Router | Type-safe routing |
| **WebSocket** | Native + Hono | Real-time updates |
| **Testing** | Vitest | Fast, ESM native |

### Configuration Values

| Setting | Value |
|---------|-------|
| Server Port | 3344 |
| Authentication | None (local usage) |
| Task Concurrency | 1 |
| Default Budget | Unlimited |
| Database | SQLite (./data/forge.db) |

---

## Package Structure

### NPM Packages

```
@claudeforge/
├── forge-shared      # Shared types & utilities
├── forge-plugin      # Claude Code Plugin
├── forge-server      # Control Center API
└── forge-web         # Control Center Dashboard
```

### Monorepo Directory Structure

```
forge/
├── packages/
│   ├── shared/           # @claudeforge/forge-shared
│   ├── plugin/           # @claudeforge/forge-plugin
│   ├── server/           # @claudeforge/forge-server
│   └── web/              # @claudeforge/forge-web
├── package.json          # Workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── README.md
```

---

## Implementation Order

Give prompt files to Claude Code in this order:

| Order | File | Description |
|-------|------|-------------|
| 1 | `01-PROJECT-SETUP.md` | Monorepo setup, root config files |
| 2 | `02-SHARED-TYPES.md` | Shared types package |
| 3 | `03-PLUGIN-CORE.md` | Plugin core modules |
| 4 | `04-PLUGIN-COMMANDS.md` | Plugin slash commands |
| 5 | `05-SERVER.md` | Control Center API |
| 6 | `06-WEB.md` | React Dashboard |
| 7 | `07-INTEGRATION.md` | Integration and testing |

---

## Usage Scenarios

### Scenario 1: Simple Forge Loop

```bash
# Install the plugin
claude plugin add @claudeforge/forge-plugin

# Start loop
/forge "Build a REST API with CRUD operations" \
  --until "tests pass" \
  --max-iterations 30

# Check status
/forge-status
```

### Scenario 2: Advanced Usage

```bash
/forge "Build authentication system with JWT" \
  --name "auth-system" \
  --until "tests pass" \
  --until "coverage > 80%" \
  --until "lint clean" \
  --max-iterations 50 \
  --max-cost "$5" \
  --checkpoint-every 5 \
  --on-stuck "retry-variation" \
  --gate "npm test" \
  --gate "npm run lint"
```

### Scenario 3: With Control Center

```bash
# Start Control Center
cd forge && pnpm dev

# Open in browser
open http://localhost:3344

# Connect plugin to Control Center
/forge "Task description" --control "http://localhost:3344"
```

---

## Development Standards

### Code Standards

- **Zero Runtime Dependencies (Plugin)**: Plugin should not use external npm packages
- **TypeScript Strict Mode**: Strict mode active in all packages
- **ESM Only**: No CommonJS
- **Error Handling**: Proper error handling in all async functions
- **No Console**: Use proper logging instead of console.log in production

### Git Conventions

- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- **Branch Naming**: `feature/xxx`, `fix/xxx`, `docs/xxx`
- **PR Required**: No direct push to main

### Build Order

```
shared → plugin → server → web
```

---

## Success Criteria

When the project is complete:

1. `pnpm install` should run without errors
2. `pnpm build` should build all packages
3. `pnpm dev` should start server and web
4. Plugin should load into Claude Code
5. `/forge "test"` command should work
6. Stop hook should trigger properly
7. Criteria evaluation should work
8. Control Center dashboard should open
9. WebSocket real-time updates should work
10. Task queue should be functional

---

## Getting Started

```bash
# Create new directory
mkdir forge && cd forge

# Give the first prompt file
# Paste 01-PROJECT-SETUP.md content to Claude Code
```

**Next step:** Open `01-PROJECT-SETUP.md` and give it to Claude Code.
