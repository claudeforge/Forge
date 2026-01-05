# FORGE

**Iterative AI Development Engine for Claude Code**

FORGE transforms Claude Code into a powerful iterative development system that can autonomously work on complex tasks until completion criteria are met.

## Features

- **Multi-criteria Completion** - Tests, coverage, lint, file checks, custom scripts
- **Intelligent Stuck Detection** - Automatic recovery with multiple strategies
- **Checkpoints & Rollback** - Git-based snapshots, never lose progress
- **Budget Controls** - Cost, time, and iteration limits
- **Control Center** - Web dashboard for real-time monitoring
- **Task Queue** - Schedule, prioritize, and auto-advance through tasks
- **Specification-Driven Development** - Decompose big goals into atomic tasks

## Quick Start

### 1. Install Plugin

```bash
# In Claude Code
/plugin install @claudeforge/forge-plugin
```

### 2. Start Control Center (Optional but Recommended)

```bash
npx @claudeforge/forge-server
# Opens at http://localhost:3344
```

### 3. Link Your Project

```bash
/forge:forge-link --project YOUR_PROJECT_ID --control http://localhost:3344
```

### 4. Decompose a Goal into Tasks

```bash
/forge:forge-tasks "Build a REST API with JWT authentication, rate limiting, and comprehensive tests"
```

### 5. Review in WebUI

Open http://localhost:3344/queue to:
- See all queued tasks
- Reorder priorities
- Edit task details
- Monitor running tasks

### 6. Execute

```bash
/forge:forge
```

FORGE will:
1. Claim the next task from queue
2. Work iteratively until criteria pass
3. Auto-advance to the next task
4. Repeat until queue is empty

## Commands

| Command | Description |
|---------|-------------|
| `/forge:forge` | Start iterative loop (queue-based or standalone) |
| `/forge:forge-tasks "GOAL"` | Decompose goal into sub-tasks |
| `/forge:forge-link` | Link project to Control Center |
| `/forge:forge-status` | Check current task status |
| `/forge:forge-pause` | Pause the current loop |
| `/forge:forge-resume` | Resume a paused loop |
| `/forge:forge-abort` | Abort and exit |
| `/forge:forge-checkpoint` | Create manual checkpoint |
| `/forge:forge-rollback` | Rollback to checkpoint |
| `/forge:forge-history` | View iteration history |

## Completion Criteria

```bash
# Tests must pass
/forge "Add feature X" --until "tests pass"

# Multiple criteria
/forge "Refactor module" --until "tests pass" --until "lint clean"

# Coverage threshold
/forge "Increase coverage" --until "coverage > 80%"

# File must exist
/forge "Generate config" --until "file exists config.yaml"

# Custom command
/forge "Fix build" --until "npm run build"
```

## Architecture

```
.forge/
├── state.json                 # Active loop state
├── command.json               # External commands (pause/abort)
└── tasks/
    └── {task-id}/
        ├── task.json          # Task configuration
        ├── iterations/
        │   ├── 001.json       # Iteration 1 details
        │   ├── 002.json       # Iteration 2 details
        │   └── ...
        ├── checkpoints/       # Git stash references
        └── result.json        # Final outcome
```

## Packages

| Package | Description |
|---------|-------------|
| `@claudeforge/forge-shared` | Shared types, constants, utilities |
| `@claudeforge/forge-plugin` | Claude Code plugin (hooks + commands) |
| `@claudeforge/forge-server` | Control Center API (Hono + SQLite) |
| `@claudeforge/forge-web` | Web Dashboard (React + TanStack Query) |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development (server + web)
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test
```

## Configuration

Create `.forge.json` in your project root:

```json
{
  "projectId": "proj-abc123",
  "controlUrl": "http://localhost:3344"
}
```

Or use `/forge:forge-link` to create it automatically.

## License

MIT
