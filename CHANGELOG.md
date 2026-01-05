# Changelog

All notable changes to FORGE will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-05

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
