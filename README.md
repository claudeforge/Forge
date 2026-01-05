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
- **Sync v2 Protocol** - Conflict-free sync with optimistic locking
- **Task Locking** - Exclusive execution with heartbeat renewal
- **Intervention System** - Pause, abort, retry tasks from Control Center
- **Batch Mode** - Process entire queue autonomously

## Quick Start

### 1. Clone and Build

```bash
git clone https://github.com/anthropics/Forge.git
cd Forge
pnpm install
pnpm build
```

### 2. Install Plugin in Claude Code

Add the plugin to your Claude Code settings:

```bash
# Open Claude Code settings
claude mcp add forge /path/to/Forge/packages/plugin
```

Or add manually to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "forge": {
      "command": "node",
      "args": ["/path/to/Forge/packages/plugin/dist/hooks/stop.js"]
    }
  }
}
```

### 3. Start Control Center

```bash
cd /path/to/Forge
pnpm dev:server
# Opens at http://127.0.0.1:3344
```

Or run directly:

```bash
node packages/server/dist/index.js
```

### 4. Create a Specification

```bash
/forge:forge-spec "Add user authentication with JWT tokens"
```

This creates a formal specification with:
- Requirements analysis
- Acceptance criteria
- Technical considerations
- Clarifying questions

### 5. Create Implementation Plan

```bash
/forge:forge-plan spec-001
```

Generates a detailed plan with:
- Architecture decisions
- Task breakdown with dependencies
- Success criteria per task

### 6. Queue Tasks

```bash
/forge:forge-queue --plan plan-001
```

### 7. Execute

```bash
# Single task mode (interactive)
/forge:forge

# Batch mode (process entire queue autonomously)
/forge:forge-batch
```

FORGE will:
1. Claim the next task from queue (with exclusive lock)
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
| `/forge:forge` | Start single task execution |
| `/forge:forge-batch` | Process entire queue autonomously |
| `/forge:forge-adopt TASK_ID` | Formalize WebUI tasks into spec workflow |
| `/forge:forge-request` | Process pending WebUI requests |
| `/forge:forge-done` | Mark current task as manually completed |

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
| `/forge:forge-sync` | Full bidirectional sync |

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

- **Dashboard** - Overview with sync monitor toggle
- **Specs** - View and manage specifications
- **Tasks** - Browse all tasks with filtering
- **Queue** - Manage task queue, reorder priorities
- **Projects** - Manage registered projects
- **Analytics** - Token usage and success rates
- **Commands** - Full command reference

### Sync Monitor Features

- **Health Status** - Real-time sync health (healthy/degraded/offline)
- **Connected Nodes** - View all plugin instances
- **Active Locks** - Monitor task locks with expiry countdown
- **Stuck Detection** - Auto-detect tasks running too long
- **Intervention Actions** - Pause, abort, retry, release locks
- **Sync Log** - Activity history with timestamps

### Interventions

From Control Center, operators can:

| Action | Description |
|--------|-------------|
| **Pause** | Send pause command to running task |
| **Abort** | Force abort a stuck task |
| **Release Lock** | Free a task lock for reassignment |
| **Retry** | Requeue a failed task |
| **Force Status** | Override task status |

## Sync Protocol v2

FORGE uses a robust sync protocol with:

### Optimistic Locking
```
Plugin: "I have version 5, updating to 6"
Server: "OK" or "Conflict: I have version 7"
```

### Task Locking
- Exclusive lock per task (only one executor)
- Heartbeat renewal (30-second interval)
- Auto-release on timeout (5 minutes)
- Manual release from Control Center

### Conflict Resolution
1. Terminal states (completed/aborted) are immutable
2. Invalid transitions are rejected
3. Active runner's completion states win
4. Higher (more final) state wins
5. Server wins by default

### State Machine
```
queued → running → completed
           ↓
         paused → running
           ↓
         failed → queued (retry)
           ↓
         aborted (terminal)
```

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

## Project Structure

```
.forge.json                    # Project link configuration
.forge/
├── specs/                     # Specification documents
│   └── spec-001.md
├── plans/                     # Implementation plans
│   └── plan-001.md
├── tasks/                     # Task definitions
│   └── t001.yaml
├── rules.yaml                 # Project rules and constraints
├── node-identity.json         # Plugin node ID (v2)
├── execution.json             # Execution state (v2)
└── pending-sync.json          # Queued status updates

.claude/
└── forge-state.json           # Active loop state
```

## Configuration

Create `.forge.json` in your project root:

```json
{
  "projectId": "proj-abc123",
  "controlUrl": "http://127.0.0.1:3344"
}
```

Or use `/forge:forge-register` to create it automatically.

## Project Rules

Create `.forge/rules.yaml` to enforce project standards:

```yaml
name: My Project
description: Project description

techStack:
  language:
    primary: TypeScript
    version: "5.0"
    strict: true
  runtime:
    name: Node.js
    version: "20"
  framework:
    name: React
    version: "18"
  testing:
    framework: Vitest
    coverage: 80

conventions:
  fileNaming: kebab-case
  componentNaming: PascalCase
  functionStyle: arrow
  exportStyle: named

constraints:
  forbidden:
    libraries: [moment, lodash]
    patterns: [any type, class components]
  required:
    patterns: [error boundaries]

customRules:
  - Always use semantic HTML
  - Document all public APIs
```

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `forge-shared` | `packages/shared` | Shared types, constants, utilities, sync protocol |
| `forge-plugin` | `packages/plugin` | Claude Code plugin (hooks + commands + sync client) |
| `forge-server` | `packages/server` | Control Center API (Hono + SQLite + Sync v2) |
| `forge-web` | `packages/web` | Web Dashboard (React + TanStack Query + Sync Monitor) |

## API Endpoints

### Projects
```
GET  /api/projects           # List projects
POST /api/projects           # Create project
GET  /api/projects/:id       # Get project
```

### Tasks
```
GET  /api/tasks              # List tasks
POST /api/tasks              # Create task
GET  /api/tasks/:id          # Get task
PUT  /api/tasks/:id          # Update task
```

### Queue
```
GET  /api/queue/:projectId   # Get queue for project
POST /api/queue/reorder      # Reorder queue
```

### Sync v2 - Node Management
```
POST /api/v2/sync/nodes/register           # Register plugin node
POST /api/v2/sync/nodes/:nodeId/heartbeat  # Node heartbeat
GET  /api/v2/sync/nodes/:projectId         # List connected nodes
```

### Sync v2 - Protocol
```
POST /api/v2/sync/handshake/:projectId     # Sync handshake (exchange versions)
POST /api/v2/sync/push/:projectId          # Push updates with optimistic locking
POST /api/v2/sync/pull/:projectId          # Pull updates by task IDs
```

### Sync v2 - Task Locking
```
POST /api/v2/sync/tasks/:taskId/claim      # Claim task (exclusive lock)
POST /api/v2/sync/tasks/:taskId/heartbeat  # Heartbeat (extend lock)
POST /api/v2/sync/tasks/:taskId/release    # Release lock
```

### Sync v2 - Interventions
```
POST /api/v2/sync/intervene                # Create intervention (pause/abort/retry)
GET  /api/v2/sync/interventions/:taskId    # Get intervention history
```

### Sync v2 - Monitoring
```
GET  /api/v2/sync/status/:projectId        # Get sync status (health, nodes, locks)
GET  /api/v2/sync/log/:projectId           # Get sync activity log
POST /api/v2/sync/fix-expired-locks        # Fix all expired locks
```

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

# Run tests with coverage
pnpm test:coverage
```

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
2. Immediate sync attempt with optimistic locking
3. Conflict resolution if version mismatch
4. If failed, queued to `.forge/pending-sync.json`
5. Auto-retry on next hook execution
6. Maximum 10 retry attempts before giving up

## License

MIT
