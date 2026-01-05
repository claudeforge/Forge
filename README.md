# FORGE

**Specification-Driven AI Development Engine for Claude Code**

FORGE transforms Claude Code into a powerful iterative development system that autonomously works on complex tasks through formal specifications, structured planning, and completion criteria verification.

## Features

- **Specification-Driven Development** - Formal specs with requirements, criteria, and clarification
- **Structured Planning** - Break down specs into tasks with dependencies
- **Multi-Criteria Completion** - Tests, coverage, lint, file checks, custom scripts
- **Intelligent Stuck Detection** - Automatic recovery with multiple strategies
- **Checkpoints & Rollback** - Git-based snapshots, never lose progress
- **Control Center** - Web dashboard for real-time monitoring
- **Task Queue** - Schedule, prioritize, and auto-advance through tasks
- **Guaranteed Sync** - Status updates never lost, queued for retry

## Quick Start

### 1. Install Plugin

```bash
# In Claude Code
/plugin install @claudeforge/forge-plugin
```

### 2. Start Control Center

```bash
npx @claudeforge/forge-server
# Opens at http://127.0.0.1:3344
```

### 3. Create a Specification

```bash
/forge:forge-spec "Add user authentication with JWT tokens"
```

This creates a formal specification with:
- Requirements analysis
- Acceptance criteria
- Technical considerations
- Clarifying questions

### 4. Create Implementation Plan

```bash
/forge:forge-plan spec-001
```

Generates a detailed plan with:
- Architecture decisions
- Task breakdown with dependencies
- Success criteria per task

### 5. Queue Tasks

```bash
/forge:forge-queue --plan plan-001
```

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

### Workflow

| Command | Description |
|---------|-------------|
| `/forge:forge-spec "desc"` | Create specification from description |
| `/forge:forge-plan SPEC_ID` | Create implementation plan |
| `/forge:forge-queue --plan PLAN_ID` | Queue tasks for execution |
| `/forge:forge` | Start autonomous execution |
| `/forge:forge-adopt TASK_ID` | Formalize WebUI tasks into spec workflow |
| `/forge:forge-request` | Process pending WebUI requests |

### Control

| Command | Description |
|---------|-------------|
| `/forge:forge-pause` | Pause the current loop |
| `/forge:forge-resume` | Resume a paused loop |
| `/forge:forge-abort` | Abort and exit |

### Checkpoints

| Command | Description |
|---------|-------------|
| `/forge:forge-checkpoint` | Create manual checkpoint |
| `/forge:forge-rollback` | Rollback to checkpoint |

### Sync

| Command | Description |
|---------|-------------|
| `/forge:forge-register` | Register with Control Center |
| `/forge:forge-link PROJECT_ID` | Link to existing project |

### Info

| Command | Description |
|---------|-------------|
| `/forge:forge-status` | Check current status |
| `/forge:forge-history` | View iteration history |
| `/forge:forge-tasks` | List tasks |
| `/forge:forge-help` | Show help |

## Control Center

Access the web dashboard at http://127.0.0.1:3344

### Pages

- **Dashboard** - Overview of current task and stats
- **Specs** - View and manage specifications
- **Tasks** - Browse all tasks with filtering
- **Queue** - Manage task queue, reorder priorities
- **Projects** - Manage registered projects
- **Analytics** - Token usage and success rates
- **Commands** - Full command reference

### Features

- Real-time task progress monitoring
- Specification and plan management
- Task queue control (pause, resume, reorder)
- Token usage analytics
- WebUI → Claude Code request workflow

## Completion Criteria

```bash
# Tests must pass
/forge:forge "Add feature X" --until "tests pass"

# Multiple criteria
/forge:forge "Refactor module" --until "tests pass" --until "lint clean"

# Coverage threshold
/forge:forge "Increase coverage" --until "coverage > 80%"

# File must exist
/forge:forge "Generate config" --until "file exists config.yaml"

# Custom command
/forge:forge "Fix build" --until "npm run build"
```

## Architecture

```
.forge/
├── specs/                     # Specification documents
│   └── spec-001.md
├── plans/                     # Implementation plans
│   └── plan-001.md
├── tasks/                     # Task definitions
│   └── t001.yaml
├── config.json                # Project configuration
└── pending-sync.json          # Queued status updates

.claude/
└── forge-state.json           # Active loop state
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

Create `.forge/config.json` in your project:

```json
{
  "controlCenter": {
    "enabled": true,
    "url": "http://127.0.0.1:3344",
    "projectId": "proj-abc123"
  },
  "autoSync": true
}
```

Or use `/forge:forge-register` to create it automatically.

## Task Sources

Tasks can originate from different sources:

| Source | Created By | Recommended Action |
|--------|------------|-------------------|
| `forge-plan` | Plugin workflow | Already proper |
| `webui-direct` | WebUI form | Run `/forge:forge-adopt` |
| `webui-quick` | WebUI quick add | Run `/forge:forge-adopt` |
| `api-import` | External API | Run `/forge:forge-adopt` |
| `manual` | Hand-written YAML | Verify and link |

## Status Sync

FORGE guarantees status updates are never lost:

1. Status change occurs (completed, failed, paused, etc.)
2. Immediate sync attempt with 3 retries
3. If failed, queued to `.forge/pending-sync.json`
4. Auto-retry on next hook execution
5. Maximum 10 retry attempts before giving up

## License

MIT
