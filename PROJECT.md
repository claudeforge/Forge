# FORGE - Project Specification

## Vision

FORGE enables **Specification-Driven Development** with Claude Code:

1. User describes a feature/goal with `/forge:forge-spec`
2. System asks clarifying questions to understand requirements
3. Creates detailed specification document
4. Decomposes spec into atomic tasks with `/forge:forge-plan`
5. Tasks queue for sequential execution via Control Center
6. Each task runs in an iterative loop until criteria pass
7. Auto-advance through the queue until complete
8. Full observability via WebUI

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SPECIFICATION-DRIVEN WORKFLOW                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User Request                                                           │
│       │                                                                  │
│       ▼                                                                  │
│   ┌───────────────┐    Clarifying      ┌───────────────┐                │
│   │ /forge:spec   │───────────────────►│ Specification │                │
│   │ "Add auth"    │    Questions       │  spec-001.md  │                │
│   └───────────────┘                    └───────┬───────┘                │
│                                                │                        │
│                                                ▼                        │
│   ┌───────────────┐    Architecture    ┌───────────────┐                │
│   │ /forge:plan   │◄───────────────────│   Analysis    │                │
│   │  spec-001     │    Decisions       └───────────────┘                │
│   └───────┬───────┘                                                     │
│           │                                                              │
│           ▼                                                              │
│   ┌───────────────────────────────────────────────────────┐             │
│   │              Task Definitions (YAML)                   │             │
│   │  .forge/tasks/                                         │             │
│   │  ├── t001.yaml  (Set up dependencies)                 │             │
│   │  ├── t002.yaml  (Create user model)                   │             │
│   │  ├── t003.yaml  (Implement JWT utils)    ──┐          │             │
│   │  ├── t004.yaml  (Create middleware)        │ deps     │             │
│   │  ├── t005.yaml  (Add routes)            ◄──┘          │             │
│   │  └── t006.yaml  (Write tests)                         │             │
│   └───────────────────────────────────────────────────────┘             │
│           │                                                              │
│           ▼                                                              │
│   ┌───────────────┐         HTTP POST        ┌─────────────────────┐    │
│   │ /forge:queue  │─────────────────────────►│   Control Center    │    │
│   │  --plan       │                          │   (Queue Manager)   │    │
│   └───────────────┘                          └──────────┬──────────┘    │
│                                                         │               │
│                                                         ▼               │
│   ┌───────────────┐    Claim Next Task       ┌─────────────────────┐    │
│   │ /forge:forge  │◄─────────────────────────│   Task Execution    │    │
│   │  (loop)       │                          │   - Iterate         │    │
│   └───────────────┘                          │   - Check criteria  │    │
│           │                                  │   - Checkpoint      │    │
│           ▼                                  │   - Auto-advance    │    │
│   ┌───────────────┐                          └─────────────────────┘    │
│   │   Complete    │                                                      │
│   └───────────────┘                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### Specification Phase

The `/forge:forge-spec` command:
1. Asks clarifying questions to understand full requirements
2. Explores codebase for context and patterns
3. Creates detailed specification in `.forge/specs/spec-NNN.md`
4. Tracks metadata in `.forge/specs/spec-NNN.json`

### Planning Phase

The `/forge:forge-plan` command:
1. Reads specification document
2. Analyzes codebase architecture
3. Makes design decisions
4. Decomposes into atomic tasks
5. Creates task YAML files with dependencies
6. Calculates execution order

### Task Definition Format

Each task in `.forge/tasks/tNNN.yaml`:

```yaml
# Identity
id: t001
title: "Short descriptive title"
description: |
  Detailed description with full context

# Dependencies
depends_on: [t001, t002]     # Must complete first
blocks: [t005]                # Blocks these tasks

# Classification
type: feature                 # feature|bugfix|refactor|test|docs|chore
priority: 1                   # 1 = highest
complexity: medium            # low|medium|high

# Technical Details
technical:
  approach: "Implementation strategy..."
  files_to_create: []
  files_to_modify: []
  considerations: []

# Success Criteria (auto-verified)
criteria:
  - type: test_pass
    name: "Tests pass"
    config: { pattern: "**/*.test.ts" }
  - type: type_check
    name: "TypeScript compiles"
    config: {}

# Execution Config
execution:
  max_iterations: 30
  checkpoint_every: 10
  on_stuck: retry-variation
  timeout_minutes: null

# Goals (human-readable)
goals:
  - "Implement core feature"
  - "Ensure tests pass"

# Status (auto-updated)
status: pending
spec_id: spec-001
plan_id: plan-001
```

### Iterative Loop

Claude Code normally exits after completing work. FORGE intercepts this via a **stop hook** and:

1. Evaluates completion criteria (tests, lint, coverage, etc.)
2. If not complete → blocks exit, feeds back status
3. If complete → allows exit (or auto-advances to next task)
4. Tracks metrics, detects stuck patterns, manages checkpoints

### Task Queue

Control Center manages execution:

- **Dependency-aware** ordering
- **Priority-based** scheduling
- **Auto-advance** to next task on completion
- **WebUI** for monitoring and management
- **Project-scoped** task organization

### Sync Protocol v2

Robust synchronization between plugins and Control Center:

- **Monotonic versioning** - Each entity has incrementing version numbers
- **Logical clocks** - Lamport timestamps for causality ordering
- **Optimistic locking** - Version-based conflict detection on updates
- **Task locking** - Exclusive locks with heartbeat renewal
- **Conflict resolution** - Hierarchical rules (terminal states win, active runner wins)

### Task Locking

Only one plugin can execute a task at a time:

- **Exclusive lock** - Claim task before execution
- **Heartbeat** - 30-second interval to keep lock alive
- **Auto-release** - Locks expire after 5 minutes without heartbeat
- **Manual release** - Control Center can force-release stuck locks

### Interventions

Control Center operators can intervene in running tasks:

| Action | Description |
|--------|-------------|
| `PAUSE` | Send pause command to running task |
| `ABORT` | Force abort a stuck task |
| `RELEASE_LOCK` | Free a task lock for reassignment |
| `RETRY` | Requeue a failed task |
| `FORCE_STATUS` | Override task status directly |

### Completion Criteria Types

| Type | Example | Evaluation |
|------|---------|------------|
| `test_pass` | Tests pass | `npm test` exits 0 |
| `type_check` | No type errors | `tsc --noEmit` exits 0 |
| `lint_pass` | No lint errors | `eslint` exits 0 |
| `file_exists` | File exists | `fs.existsSync()` |
| `file_contains` | Pattern in file | Regex/string match |
| `build_success` | Build succeeds | Build command exits 0 |
| `manual` | Human verification | Requires approval |
| `custom` | Custom script | Script exits 0 |

### Stuck Detection

When Claude gets stuck in a loop:

| Pattern | Detection | Recovery |
|---------|-----------|----------|
| Same output | 3+ identical summaries | Prompt variation |
| No progress | 5+ iterations, <5% improvement | Simplify task |
| Repeating error | Same error 3x | Rollback + retry |

Recovery strategies:
- `retry` - Simple retry
- `retry-variation` - Force different approach
- `checkpoint` - Save state and pause
- `stop` - Stop execution
- `ask` - Ask user for guidance

### Checkpoints

Git-based snapshots for safety:

- **Auto-checkpoint** every N iterations
- **Manual checkpoint** via command
- **Rollback** restores code + state
- **Pruning** keeps only last N checkpoints

## Directory Structure

```
project/
├── .forge/
│   ├── specs/                    # Specification documents
│   │   ├── spec-001.md           # Detailed requirements
│   │   ├── spec-001.json         # Metadata (status, task links)
│   │   └── ...
│   ├── plans/                    # Implementation plans
│   │   ├── plan-001.md           # Architecture decisions
│   │   ├── plan-001.json         # Metadata (task order)
│   │   └── ...
│   ├── tasks/                    # Task definition files (YAML)
│   │   ├── t001.yaml
│   │   ├── t002.yaml
│   │   └── ...
│   ├── runs/                     # Execution data
│   │   └── <task-uuid>/
│   │       ├── task.json         # Runtime config
│   │       ├── iterations/       # Per-iteration logs
│   │       └── result.json       # Final outcome
│   ├── checkpoints/              # Git-based checkpoints
│   ├── config.json               # Project config (Control Center link)
│   ├── node-identity.json        # Plugin node ID (persistent UUID)
│   ├── execution.json            # Execution state with sync metadata (v2.0)
│   └── pending-sync.json         # Queued status updates for retry
│
├── .claude/
│   └── forge-state.json          # Active task state
│
└── ... (project files)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Control Center                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Server    │  │   WebUI     │  │      Database       │  │
│  │   (Hono)    │◄─┤   (React)   │  │     (SQLite)        │  │
│  │   :3344     │  │   :5173     │  │                     │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘  │
│         │              │                                    │
│         │ REST API + WebSocket                              │
│         │              │                                    │
│  ┌──────┴──────────────┴────────────────────────────────┐  │
│  │                   Sync v2 Layer                       │  │
│  │  • Node Registry  • Task Locks  • Interventions      │  │
│  │  • Optimistic Locking  • Conflict Resolution         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────┬───────────────────────────────────────────────────┘
          │
          │ Sync Protocol v2
          │ (handshake, push, pull, claim, heartbeat)
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code + Plugin                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Commands   │  │  Stop Hook  │  │    Local State      │  │
│  │  /forge:*   │  │  (Core)     │  │   .forge/...        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                                │                   │
│  ┌──────┴────────────────────────────────┴───────────────┐  │
│  │                  Sync Client v2                        │  │
│  │  • Node Identity  • Claim/Release  • Heartbeat        │  │
│  │  • Push/Pull  • Retry Queue  • Version Tracking       │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Package Structure

### @claudeforge/forge-shared

```
src/
├── types/
│   ├── state.ts       # ForgeState, TaskFile, IterationFile
│   ├── criteria.ts    # CriterionType, CriterionResult
│   ├── spec.ts        # TaskDefinition, SpecMetadata, PlanMetadata
│   ├── events.ts      # ForgeEvent (webhooks)
│   ├── api.ts         # API request/response types
│   ├── sync.ts        # Sync protocol types (v2)
│   │                  # - SyncMetadata, NodeIdentity, TaskLock
│   │                  # - TaskStatus, VALID_TRANSITIONS
│   │                  # - resolveConflict(), isValidTransition()
│   └── execution.ts   # ExecutionFile v2 with sync metadata
├── constants/
│   ├── defaults.ts    # DEFAULT_STATE
│   └── paths.ts       # Directory paths, file helpers
├── utils/
│   └── index.ts       # generateId, validateState
└── validation/
    └── task.ts        # Task definition validation
```

### @claudeforge/forge-plugin

```
src/
├── cli/
│   ├── init.ts        # Initialize loop
│   ├── link.ts        # Link to Control Center
│   ├── add-tasks.ts   # Bulk add tasks
│   └── queue-tasks.ts # Queue YAML tasks
├── hooks/
│   └── stop.ts        # CORE: Exit interception
├── sync/
│   ├── sync-client-v2.ts  # Sync protocol client
│   │                      # - Node identity management
│   │                      # - Claim/release/heartbeat
│   │                      # - Push/pull with versions
│   └── status-sync.ts     # Guaranteed status sync with retry

commands/
├── forge.md           # /forge:forge - Execute task
├── forge-spec.md      # /forge:forge-spec - Create specification
├── forge-plan.md      # /forge:forge-plan - Create implementation plan
├── forge-queue.md     # /forge:forge-queue - Queue tasks
├── forge-link.md      # /forge:forge-link - Link to Control Center
├── forge-status.md    # /forge:forge-status - Show status
├── forge-help.md      # /forge:forge-help - Show help
└── ...
```

### @claudeforge/forge-server

```
src/
├── index.ts           # Entry point
├── app.ts             # Hono app config
├── config.ts          # Environment config
├── broadcast.ts       # WebSocket broadcasting
├── db/
│   ├── index.ts       # Drizzle setup
│   └── schema.ts      # Database schema
│                      # Tables: projects, tasks, iterations, specs,
│                      #         plans, nodes, syncLog, interventions
└── routes/
    ├── projects.ts    # /api/projects
    ├── tasks.ts       # /api/tasks
    ├── queue.ts       # /api/queue
    ├── stats.ts       # /api/stats
    └── sync-v2.ts     # /api/v2/sync/* endpoints
                       # - Node registration & heartbeat
                       # - Handshake, push, pull
                       # - Task claim, heartbeat, release
                       # - Interventions & monitoring
```

### @claudeforge/forge-web

```
src/
├── main.tsx           # Entry
├── App.tsx            # Router
├── lib/
│   ├── api.ts         # API client (includes sync v2 methods)
│   └── utils.ts       # Helpers
├── hooks/
│   ├── useStats.ts    # React Query hooks
│   └── useTasks.ts    # Task & project hooks
├── routes/
│   ├── Dashboard.tsx  # Main dashboard with sync monitor toggle
│   ├── Projects.tsx
│   ├── Tasks.tsx
│   ├── Queue.tsx
│   └── Commands.tsx   # Command reference page
└── components/
    ├── layout/
    ├── common/
    ├── task/
    └── sync/
        └── SyncMonitor.tsx  # Real-time sync monitoring UI
                             # - Health status indicator
                             # - Connected nodes list
                             # - Active locks with expiry
                             # - Stuck task detection
                             # - Intervention actions
                             # - Sync activity log
```

## API Endpoints

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/claim-task` - Claim and start task

### Tasks
- `GET /api/tasks` - List tasks (filterable by projectId)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Queue
- `GET /api/queue/status` - Get queue status
- `POST /api/queue/reorder` - Reorder queue
- `POST /api/queue/start` - Start queue processing
- `POST /api/queue/pause` - Pause queue

### Stats
- `GET /api/stats` - Get statistics

### Sync v2 (Node Management)
- `POST /api/v2/sync/nodes/register` - Register plugin node
- `POST /api/v2/sync/nodes/:nodeId/heartbeat` - Node heartbeat
- `GET /api/v2/sync/nodes/:projectId` - List connected nodes

### Sync v2 (Protocol)
- `POST /api/v2/sync/handshake/:projectId` - Sync handshake (exchange versions)
- `POST /api/v2/sync/push/:projectId` - Push updates with optimistic locking
- `POST /api/v2/sync/pull/:projectId` - Pull updates by task IDs

### Sync v2 (Task Locking)
- `POST /api/v2/sync/tasks/:taskId/claim` - Claim task (exclusive lock)
- `POST /api/v2/sync/tasks/:taskId/heartbeat` - Heartbeat (extend lock)
- `POST /api/v2/sync/tasks/:taskId/release` - Release lock

### Sync v2 (Interventions)
- `POST /api/v2/sync/intervene` - Create intervention (pause/abort/retry)
- `GET /api/v2/sync/interventions/:taskId` - Get intervention history

### Sync v2 (Monitoring)
- `GET /api/v2/sync/status/:projectId` - Get sync status (health, nodes, locks)
- `GET /api/v2/sync/log/:projectId` - Get sync activity log
- `POST /api/v2/sync/fix-expired-locks` - Fix all expired locks

## Commands Reference

### Workflow
| Command | Description |
|---------|-------------|
| `/forge:forge-spec` | Create specification with clarification |
| `/forge:forge-plan` | Create implementation plan from spec |
| `/forge:forge-queue` | Queue tasks to Control Center |
| `/forge:forge` | Execute next task in loop |
| `/forge:forge-adopt` | Formalize WebUI tasks into spec workflow |
| `/forge:forge-request` | Process pending WebUI requests |

### Control
| Command | Description |
|---------|-------------|
| `/forge:forge-pause` | Pause current execution |
| `/forge:forge-resume` | Resume paused execution |
| `/forge:forge-abort` | Abort and exit |
| `/forge:forge-status` | Show comprehensive status |
| `/forge:forge-help` | Display help information |

### Checkpoints
| Command | Description |
|---------|-------------|
| `/forge:forge-checkpoint` | Create manual checkpoint |
| `/forge:forge-rollback` | Rollback to checkpoint |

### Sync
| Command | Description |
|---------|-------------|
| `/forge:forge-register` | Register with Control Center |
| `/forge:forge-link` | Link project to Control Center |
| `/forge:forge-sync` | Full bidirectional sync |

## Future Enhancements

- [ ] Parallel task execution (with dependency respect)
- [ ] Slack/Discord notifications
- [ ] GitHub PR integration
- [ ] Test coverage tracking
- [ ] Performance benchmarking
- [ ] Multi-model support
- [ ] Task templates library
- [ ] Spec versioning
- [ ] Multi-project sync dashboard
- [ ] Offline mode with full sync on reconnect
