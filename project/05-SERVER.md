# 05 - Control Center Server

> **Use this prompt to create the `@claudeforge/forge-server` package.**

---

## Package Summary

Control Center API server. Receives webhooks from plugin, manages task queue, provides real-time updates.

---

## Technologies

- **Runtime**: Node.js 20+
- **Framework**: Hono
- **Database**: SQLite + Drizzle ORM
- **WebSocket**: @hono/node-ws
- **Port**: 3344

---

## Package Structure

```
packages/server/
├── src/
│   ├── index.ts              # Entry point, server start
│   ├── app.ts                # Hono app configuration
│   ├── config.ts             # Environment config
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   └── schema.ts         # Drizzle schema (tables)
│   ├── routes/
│   │   ├── index.ts          # Route aggregator
│   │   ├── projects.ts       # CRUD /api/projects
│   │   ├── tasks.ts          # CRUD /api/tasks
│   │   ├── queue.ts          # Queue operations /api/queue
│   │   ├── webhooks.ts       # Webhook receiver /api/webhooks
│   │   └── stats.ts          # Analytics /api/stats
│   ├── ws/
│   │   └── handler.ts        # WebSocket connection handler
│   ├── queue/
│   │   ├── manager.ts        # Queue state & operations
│   │   └── executor.ts       # Claude CLI task runner
│   └── broadcast.ts          # WebSocket broadcast utility
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── drizzle.config.ts
```

---

## Database Schema

### Tables

**projects**
- id (TEXT, PK)
- name (TEXT)
- path (TEXT, UNIQUE)
- created_at (TEXT)
- last_activity_at (TEXT, nullable)

**tasks**
- id (TEXT, PK)
- project_id (TEXT, FK → projects)
- name (TEXT)
- prompt (TEXT)
- status (TEXT): queued | running | completed | failed | paused | stuck | aborted
- priority (INTEGER, default 0)
- depends_on (TEXT, JSON array)
- scheduled_at (TEXT, nullable)
- started_at (TEXT, nullable)
- completed_at (TEXT, nullable)
- iteration (INTEGER)
- config (TEXT, JSON)
- result (TEXT, JSON, nullable)
- created_at (TEXT)

**iterations**
- id (TEXT, PK)
- task_id (TEXT, FK → tasks)
- iteration_num (INTEGER)
- started_at (TEXT)
- ended_at (TEXT)
- duration (REAL)
- tokens (INTEGER)
- outcome (TEXT)
- summary (TEXT)
- criteria_results (TEXT, JSON)
- created_at (TEXT)

**checkpoints**
- id (TEXT, PK)
- task_id (TEXT, FK → tasks)
- iteration_num (INTEGER)
- type (TEXT): auto | manual
- git_ref (TEXT)
- metrics (TEXT, JSON)
- created_at (TEXT)

**cost_log**
- id (TEXT, PK)
- task_id (TEXT, FK → tasks)
- tokens (INTEGER)
- cost (REAL)
- created_at (TEXT)

---

## API Endpoints

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects | List all projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project |
| DELETE | /api/projects/:id | Delete project |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tasks | List tasks (optional ?projectId=) |
| POST | /api/tasks | Create task |
| GET | /api/tasks/:id | Get task |
| PATCH | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| GET | /api/tasks/:id/iterations | Get task iterations |

### Queue
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/queue | Get queue status |
| GET | /api/queue/queued | Get queued tasks |
| POST | /api/queue/reorder | Reorder queue |
| POST | /api/queue/run-next | Run next task |
| POST | /api/queue/pause | Pause queue |
| POST | /api/queue/resume | Resume queue |

### Webhooks
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/webhooks/forge | Receive plugin events |

### Stats
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/stats | Get overall statistics |
| GET | /api/stats/cost-by-day | Cost breakdown by day |

### WebSocket
| Path | Description |
|------|-------------|
| WS /api/ws | Real-time updates |

---

## WebSocket Messages

Server → Client:
- `{ type: "connected", clientId: string }`
- `{ type: "task:update", task: Task }`
- `{ type: "queue:update", queue: QueueStatus }`
- `{ type: "iteration", taskId: string, iteration: number, record: object }`
- `{ type: "output", taskId: string, content: string }`

---

## Queue Manager

- Concurrency: 1 (single task runs)
- Priority-based ordering
- Dependency checking (dependsOn array)
- Schedule support (scheduledAt)
- Auto-run next on completion

---

## Task Executor

Runs Claude CLI:
```bash
claude --print "/forge \"PROMPT\" --until ... --control http://localhost:3344"
```

- Working directory: project.path
- Environment: FORGE_TASK_ID, FORGE_PROJECT_ID
- stdout/stderr → WebSocket broadcast

---

## Dependencies

```json
{
  "dependencies": {
    "@claudeforge/forge-shared": "workspace:*",
    "@hono/node-server": "^1.8.0",
    "@hono/node-ws": "^1.0.0",
    "better-sqlite3": "^11.0.0",
    "drizzle-orm": "^0.30.0",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "drizzle-kit": "^0.21.0",
    "tsup": "^8.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Next Step

Move to `06-WEB.md`.
