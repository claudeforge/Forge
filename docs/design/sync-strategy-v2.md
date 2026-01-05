# Forge Sync Strategy v2.0

## Problem Statement

### 1. Timestamp-Only Reliance
```
Plugin: 10:00:00.000 -> "completed"
Server: 10:00:00.001 -> "running" (network delay)
```
Who wins? By timestamp, the server does, but the plugin is actually correct.

### 2. Clock Skew
- Plugin and Server clocks may differ
- Without NTP sync, they can drift by seconds

### 3. Lost Updates
```
Plugin A: read(v1) -> modify -> write(v2)
Plugin B: read(v1) -> modify -> write(v2') // A's changes lost!
```

### 4. Split Brain
What if two plugins try to claim the same task simultaneously?

---

## Solution: Hybrid Vector Clock + Monotonic Version

### Core Principle: "Causality > Time"
What matters is the **order of events**, not the wall clock time.

---

## 1. Sync Metadata Structure

```typescript
interface SyncMetadata {
  // Monotonically increasing version per entity
  version: number;

  // Logical clock (Lamport timestamp)
  logicalClock: number;

  // Last writer identity
  lastWriter: {
    nodeId: string;      // "plugin-abc123" or "server"
    nodeType: "plugin" | "server";
  };

  // Physical timestamp (for debugging/display only)
  physicalTime: string;

  // Checksum of content (for integrity)
  contentHash: string;
}
```

---

## 2. Node Identity & Registration

Each plugin instance gets a unique ID:

```typescript
interface NodeIdentity {
  nodeId: string;           // UUID, persisted in .forge/node-identity.json
  nodeType: "plugin";
  registeredAt: string;
  lastSeen: string;
  capabilities: string[];
}
```

### Server Registration:
```
POST /api/v2/sync/nodes/register
{
  nodeId: "plugin-abc123",
  nodeType: "plugin",
  projectId: "proj-xyz",
  capabilities: ["execute", "sync"]
}

Response:
{
  success: true,
  serverClock: 42,
  serverTime: "2024-01-01T10:00:00Z"
}
```

---

## 3. Conflict Detection

### Rule: Version Mismatch = Conflict

```typescript
function detectConflict(
  local: SyncMetadata,
  remote: SyncMetadata
): ConflictType {
  if (local.version === remote.version) return "NONE";
  if (remote.version > local.version) return "BEHIND";
  if (local.version > remote.version) return "AHEAD";
  return "DIVERGED";
}
```

---

## 4. Conflict Resolution Strategy

### 4.1 Task Status: State Machine Rules

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
┌─────────┐    ┌─────────┐    ┌───────────┐    ┌────────────┐
│ QUEUED  │───►│ RUNNING │───►│ COMPLETED │    │  ABORTED   │
└─────────┘    └─────────┘    └───────────┘    └────────────┘
     │              │              ▲                  ▲
     │              │              │                  │
     │              ▼              │                  │
     │         ┌─────────┐        │                  │
     │         │ PAUSED  │────────┤                  │
     │         └─────────┘        │                  │
     │              │              │                  │
     │              ▼              │                  │
     │         ┌─────────┐        │                  │
     └────────►│ FAILED  │────────┴──────────────────┘
               └─────────┘

Valid Transitions:
- queued    → running, aborted
- running   → completed, failed, paused, aborted, stuck
- paused    → running, completed, failed, aborted
- stuck     → failed, aborted, running (manual retry)
- completed → (terminal)
- failed    → queued (manual retry), aborted
- aborted   → (terminal)
```

### 4.2 Resolution Rules (Priority Order)

```typescript
function resolveConflict(context: ConflictContext): ConflictResolution {
  const { serverState, pluginState, pluginIsActiveRunner } = context;

  // Rule 1: Terminal states are immutable
  if (isTerminalState(serverState.status)) {
    return "SERVER_WINS";
  }

  // Rule 2: Invalid transition = reject plugin
  if (!isValidTransition(serverState.status, pluginState.status)) {
    return "REJECT";
  }

  // Rule 3: Plugin actively running = plugin wins
  if (pluginIsActiveRunner && pluginState.status === "running") {
    return "PLUGIN_WINS";
  }

  // Rule 4: Completion states from active runner always win
  if (pluginIsActiveRunner &&
      ["completed", "failed"].includes(pluginState.status)) {
    return "PLUGIN_WINS";
  }

  // Rule 5: Higher (more final) state wins
  if (STATUS_ORDER[pluginState.status] > STATUS_ORDER[serverState.status]) {
    return "PLUGIN_WINS";
  }

  // Rule 6: Server wins by default
  return "SERVER_WINS";
}
```

---

## 5. Sync Protocol

### 5.1 Optimistic Locking with Version

```typescript
// Plugin sends update with expected version
POST /api/v2/sync/push/:projectId
{
  nodeId: "plugin-abc123",
  tasks: [{
    id: "task-xyz",
    status: "completed",
    expectedVersion: 5,      // "I think server is at v5"
    result: { ... }
  }]
}

// Server Response:
{
  results: [{
    taskId: "task-xyz",
    success: true,
    newVersion: 6
  }],
  serverClock: 43
}

// Or on conflict:
{
  results: [{
    taskId: "task-xyz",
    success: false,
    error: "VERSION_CONFLICT",
    resolution: "SERVER_WINS",
    serverState: { status: "completed", version: 7 }
  }],
  serverClock: 43
}
```

### 5.2 Full Sync Protocol

```typescript
// Step 1: Exchange sync metadata
POST /api/v2/sync/handshake/:projectId
{
  nodeId: "plugin-abc123",
  localClock: 42,
  taskVersions: {
    "task-1": 5,
    "task-2": 3,
    "task-3": 7
  }
}

Response:
{
  serverClock: 50,
  conflicts: [
    { taskId: "task-1", localVersion: 5, serverVersion: 8 },
    { taskId: "task-3", localVersion: 7, serverVersion: 6 }
  ],
  needsPull: ["task-1"],      // Server ahead
  needsPush: ["task-3"],      // Plugin ahead
  inSync: ["task-2"]          // Already synced
}

// Step 2: Pull server changes
POST /api/v2/sync/pull/:projectId
{ nodeId: "plugin-abc123", taskIds: ["task-1"] }

// Step 3: Push local changes
POST /api/v2/sync/push/:projectId
{ nodeId: "plugin-abc123", tasks: [...] }
```

---

## 6. Active Runner Lock

Only 1 plugin can run a task at a time:

```typescript
interface TaskLock {
  taskId: string;
  lockedBy: string;        // nodeId
  lockedAt: string;
  expiresAt: string;       // Auto-release after timeout
  heartbeatAt: string;
}

// Claim task with atomic lock
POST /api/v2/sync/tasks/:taskId/claim
{
  nodeId: "plugin-abc123",
  lockDuration: 300000     // 5 minutes, renewable
}

Response (success):
{
  success: true,
  lock: { ... },
  task: { ... }
}

Response (locked):
{
  success: false,
  error: "ALREADY_LOCKED",
  lockedBy: "plugin-def456",
  lockedUntil: "2024-01-01T10:05:00Z"
}

// Heartbeat to keep lock alive
POST /api/v2/sync/tasks/:taskId/heartbeat
{
  nodeId: "plugin-abc123",
  iteration: 5,
  progress: 0.6
}
```

---

## 7. Control Center Interventions

The Control Center can intervene in running tasks:

```typescript
type InterventionType =
  | "FORCE_STATUS"     // Force task to specific status
  | "RELEASE_LOCK"     // Force release a lock
  | "REASSIGN"         // Reassign to different node
  | "ABORT"            // Send abort command
  | "PAUSE"            // Send pause command
  | "RESUME"           // Send resume command
  | "RETRY";           // Retry failed task

POST /api/v2/sync/intervene
{
  type: "ABORT",
  taskId: "task-xyz",
  requestedBy: "admin",
  reason: "Task stuck for too long"
}
```

Interventions are delivered to plugins via heartbeat response:

```typescript
// Heartbeat response with intervention command
{
  success: true,
  expiresAt: "...",
  commands: [
    { type: "ABORT", reason: "Requested by admin" }
  ]
}
```

---

## 8. Implementation Files

| Component | Location | Purpose |
|-----------|----------|---------|
| Sync Types | `packages/shared/src/types/sync.ts` | Type definitions for sync protocol |
| Execution Types | `packages/shared/src/types/execution.ts` | ExecutionFile v2.0 with sync metadata |
| DB Schema | `packages/server/src/db/schema.ts` | nodes, syncLog, interventions tables |
| Sync Routes v2 | `packages/server/src/routes/sync-v2.ts` | All v2 sync endpoints |
| Plugin Client | `packages/plugin/src/sync/sync-client-v2.ts` | Plugin-side sync client |
| UI Monitor | `packages/web/src/components/sync/SyncMonitor.tsx` | Control Center monitoring UI |

---

## 9. API Endpoints Summary

```
# Node Management
POST /api/v2/sync/nodes/register          - Register a node
POST /api/v2/sync/nodes/:nodeId/heartbeat - Node heartbeat
GET  /api/v2/sync/nodes/:projectId        - List nodes

# Sync Protocol
POST /api/v2/sync/handshake/:projectId    - Sync handshake
POST /api/v2/sync/push/:projectId         - Push updates
POST /api/v2/sync/pull/:projectId         - Pull updates

# Task Locking
POST /api/v2/sync/tasks/:taskId/claim     - Claim task (lock)
POST /api/v2/sync/tasks/:taskId/heartbeat - Heartbeat (extend lock)
POST /api/v2/sync/tasks/:taskId/release   - Release lock

# Interventions
POST /api/v2/sync/intervene               - Create intervention
GET  /api/v2/sync/interventions/:taskId   - Get intervention history

# Monitoring
GET  /api/v2/sync/status/:projectId       - Get sync status
GET  /api/v2/sync/log/:projectId          - Get sync log
POST /api/v2/sync/fix-expired-locks       - Fix all expired locks
```

---

## 10. Summary

| Problem | Solution |
|---------|----------|
| Clock skew | Logical clocks (Lamport) |
| Lost updates | Optimistic locking with versions |
| Split brain | Active runner lock |
| Invalid states | State machine validation |
| Conflict resolution | Hierarchical rules |
| Monitoring | Real-time sync status UI |
| Manual intervention | Control Center commands |

This design ensures:
- **Eventually consistent**: Will always converge
- **Causality-preserving**: Event order is preserved
- **Partition-tolerant**: Works offline
- **Conflict-aware**: Detects and resolves conflicts
- **Observable**: Full visibility via Control Center
