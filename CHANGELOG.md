# Changelog

All notable changes to FORGE will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.4] - 2026-01-06

### Fixed

#### Plugin Marketplace Installation
- **Pre-built dist files** - Plugin `dist/` folder now included in git repository
- **Hook script availability** - `dist/hooks/stop.js` available immediately after marketplace installation
- **No build step required** - Plugin works out-of-the-box when installed from git source

### Changed

- Updated `.gitignore` to allow `packages/plugin/dist/` exception
- Added `hooks/hooks.json` at plugin root level for better compatibility
- Updated `setup.ts` to copy hooks from correct locations

---

## [0.2.3] - 2026-01-06

### Added

#### Dark/Light Theme Support
- **ThemeProvider** - React context for theme state management
- **ThemeToggle** - Sun/Moon toggle in header with system/light/dark options
- **System preference detection** - Auto-detects OS theme via `prefers-color-scheme`
- **localStorage persistence** - Theme preference saved as `forge-theme`
- **Real-time OS sync** - Listens for OS theme changes when set to "system"

### Changed

#### Theme Color Updates
- All components updated with `dark:` prefix pattern for proper light/dark support
- Status colors now use `-600` in light mode, `-400` in dark mode for better contrast
- Updated files: TaskCard, StatusBadge, DependencyGraph, ExecutionMonitor, IterationLogViewer, SyncMonitor, and all route pages

#### Sync Error Handling
- YAML parse errors now grouped into single notification instead of individual toasts
- Detailed errors logged to browser console for debugging
- Sync continues gracefully when individual task files have parse errors

### Fixed

- Light theme text contrast issues on colored backgrounds
- EmptyState icon color (was backwards - light in light mode)
- Type/complexity badge colors in TaskCard, Queue, Tasks pages
- Status colors in getStatusColor utility function

---

## [0.2.2] - 2026-01-06

### Added

#### Test Coverage Improvements
- **sync-client-v2.test.ts** - Comprehensive tests for SyncClientV2 class
  - Node identity management
  - Registration, handshake, claim, heartbeat, push, release
  - Full sync and factory singleton tests
- **rules.test.ts** - Tests for project rules loader
  - loadProjectRules, formatRulesForPrompt, getRulesSection
  - Tech stack, conventions, structure, constraints formatting
- Coverage increased from 69% to **99.47%**

#### Documentation
- Updated README.md with accurate command list (21 commands)
- Added missing commands: `forge-batch`, `forge-done`
- Fixed configuration path documentation (`.forge.json`)
- Added Project Rules section with `rules.yaml` example
- Complete API v2 endpoints documentation

### Fixed

- **Version format** - Changed `v0.2.2` to `0.2.2` (npm standard)
- **Type assertions** - Fixed `response.json()` type assertions in sync-client-v2.ts
- **CriterionConfig** - Fixed test files using correct config shape `{ cmd: "test" }`
- **ExecutionFile** - Added required fields in test fixtures
- **Windows paths** - Fixed path separator issues in rules.test.ts

### Changed

- All package versions now use standard semver format (without `v` prefix)

---

## [v0.3.0] - 2026-01-05

### Added

#### Sync Protocol v2
- **Monotonic versioning** - Each entity has an incrementing version number
- **Logical clocks** - Lamport timestamps for causality ordering
- **Optimistic locking** - Version-based conflict detection on updates
- **Conflict resolution** - Hierarchical rules (terminal states win, active runner wins, etc.)

#### Task Locking System
- **Exclusive locks** - Only one plugin can execute a task at a time
- **Heartbeat mechanism** - 30-second heartbeat to extend locks
- **Auto-release** - Locks expire after 5 minutes without heartbeat
- **Manual release** - Control Center can force-release locks

#### Node Identity
- **Persistent node ID** - Each plugin instance gets a UUID stored in `.forge/node-identity.json`
- **Node registration** - Plugins register with Control Center on startup
- **Node tracking** - Server tracks all connected nodes per project

#### Control Center Interventions
- **PAUSE** - Send pause command to running task
- **ABORT** - Force abort a stuck task
- **RELEASE_LOCK** - Free a task lock for reassignment
- **RETRY** - Requeue a failed task with optional iteration reset
- **FORCE_STATUS** - Override task status directly
- Interventions delivered via heartbeat response

#### Sync Monitor UI
- **Health status** - Real-time sync health indicator (healthy/degraded/offline)
- **Connected nodes** - List of all plugin instances with online status
- **Active locks** - View all task locks with expiry countdown
- **Stuck detection** - Highlight tasks running longer than 1 hour
- **Intervention modal** - Quick actions (pause, abort, release, retry)
- **Sync log** - Recent activity with timestamps and node IDs
- **Fix expired locks** - Batch fix all expired locks

#### Database Schema Updates
- `nodes` table - Track plugin instances
- `syncLog` table - Operation history
- `interventions` table - Intervention records
- `tasks.syncVersion` - Version number per task
- `tasks.lockedBy` - Current lock holder
- `tasks.lockedAt` - Lock acquisition time
- `tasks.lockExpiresAt` - Lock expiry time

#### New API Endpoints (v2)
```
# Node Management
POST /api/v2/sync/nodes/register
POST /api/v2/sync/nodes/:nodeId/heartbeat
GET  /api/v2/sync/nodes/:projectId

# Sync Protocol
POST /api/v2/sync/handshake/:projectId
POST /api/v2/sync/push/:projectId
POST /api/v2/sync/pull/:projectId

# Task Locking
POST /api/v2/sync/tasks/:taskId/claim
POST /api/v2/sync/tasks/:taskId/heartbeat
POST /api/v2/sync/tasks/:taskId/release

# Interventions
POST /api/v2/sync/intervene
GET  /api/v2/sync/interventions/:taskId

# Monitoring
GET  /api/v2/sync/status/:projectId
GET  /api/v2/sync/log/:projectId
POST /api/v2/sync/fix-expired-locks
```

#### Shared Types
- `SyncMetadata` - Version, logical clock, last writer
- `NodeIdentity` - Node registration data
- `TaskLock` - Lock state with expiry
- `TaskStatus` - Full state enum with transitions
- `VALID_TRANSITIONS` - State machine rules
- `resolveConflict()` - Conflict resolution function

### Changed

- Execution file format updated to v2.0 with sync metadata
- Task claim now requires exclusive lock
- Status updates use optimistic locking
- Dashboard includes collapsible Sync Monitor

### Files Added

| File | Description |
|------|-------------|
| `packages/shared/src/types/sync.ts` | Sync protocol type definitions |
| `packages/server/src/routes/sync-v2.ts` | v2 sync API endpoints |
| `packages/plugin/src/sync/sync-client-v2.ts` | Plugin sync client |
| `packages/web/src/components/sync/SyncMonitor.tsx` | Sync monitoring UI |
| `docs/design/sync-strategy-v2.md` | Full design document |

---

## [v0.2.1] - 2026-01-05

### Added

#### Specification-Driven Development
- **`/forge:forge-spec`** - Create formal specifications from feature descriptions
- **`/forge:forge-plan`** - Generate implementation plans with task breakdown
- **`/forge:forge-queue`** - Queue tasks for autonomous execution
- Complete workflow: Spec → Plan → Queue → Execute

#### Task Source Tracking
- Track where tasks originate: `forge-plan`, `forge-adopt`, `webui-direct`, `webui-quick`, `api-import`, `manual`
- `needs_formalization` flag for tasks requiring adoption into spec workflow
- **`/forge:forge-adopt`** - Formalize WebUI-created tasks into proper spec/plan structure

#### WebUI ↔ Claude Code Integration
- **`/forge:forge-request`** - Process pending requests from WebUI
- Request types: `spec`, `plan`, `adopt`, `clarify`
- Bidirectional sync between WebUI and Claude Code plugin

#### Guaranteed Status Sync
- New `status-sync.ts` module with retry and queue mechanism
- Status updates never lost - queued for retry if Control Center unreachable
- `pending-sync.json` for failed updates
- Auto-recovery on next hook execution

#### Control Center Auto-Registration
- **`/forge:forge-register`** - Register project with Control Center
- Auto-detects Control Center at `http://127.0.0.1:3344`
- Automatic project registration on first FORGE command

#### WebUI Commands Page
- New `/commands` route with full command reference
- Organized by category: Workflow, Control, Checkpoint, Sync, Info
- Quick Start guide
- Examples and detailed descriptions for each command

#### Templates and Guides
- `spec.template.md` - Full specification structure
- `plan.template.md` - Implementation plan structure
- `task.template.yaml` - Task YAML with all fields
- `clarification-guide.md` - How to ask clarifying questions
- `workflow-guide.md` - Complete workflow documentation
- Example files for auth feature implementation

### Changed

- Removed all cost tracking (user preference)
  - Removed `estimatedCost` from ForgeMetrics
  - Removed `cost` from TaskDefResult
  - Removed `costLog` table from database
  - Removed cost displays from WebUI
  - Replaced cost metrics with token usage analytics
- Updated ForgeMetrics to focus on tokens and duration
- Updated all documentation to reflect token-based analytics

### Removed

- `packages/plugin/src/utils/cost.ts` - Cost estimation utility
- `getCostByDay` API endpoint
- `useCostByDay` React hook
- `formatCost` utility function
- All cost-related UI components

---

## [0.1.0] - 2025-12-01

### Added

- Initial release
- Core iterative loop with stop hook
- Multi-criteria completion checking
- Stuck detection with recovery strategies
- Git-based checkpoints and rollback
- Budget controls (time, iterations, tokens)
- Control Center API server
- Web Dashboard with real-time monitoring
- Task queue with auto-advance
- WebSocket support for live updates

### Packages

- `@claudeforge/forge-shared` - Shared types and utilities
- `@claudeforge/forge-plugin` - Claude Code plugin
- `@claudeforge/forge-server` - Control Center API
- `@claudeforge/forge-web` - Web Dashboard
