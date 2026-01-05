# Specification-Driven Development Workflow

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FORGE Spec Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. /forge:forge-spec "Build auth system"                       │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────────────────────────────┐                       │
│  │  CLARIFICATION PHASE                 │                       │
│  │  - Ask questions about requirements  │                       │
│  │  - Understand constraints            │                       │
│  │  - Define scope                      │                       │
│  └──────────────────────────────────────┘                       │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────────────────────────────┐                       │
│  │  PLANNING PHASE                      │                       │
│  │  - Create .forge/specs/spec-001.md   │                       │
│  │  - Architecture decisions            │                       │
│  │  - Implementation plan               │                       │
│  └──────────────────────────────────────┘                       │
│     │                                                            │
│     ▼                                                            │
│  2. /forge:forge-plan                                           │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────────────────────────────┐                       │
│  │  DECOMPOSITION PHASE                 │                       │
│  │  - Break plan into atomic tasks      │                       │
│  │  - Create .forge/tasks/t001.yaml     │                       │
│  │  - Define dependencies               │                       │
│  │  - Set success criteria              │                       │
│  └──────────────────────────────────────┘                       │
│     │                                                            │
│     ▼                                                            │
│  3. /forge:forge-queue                                          │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────────────────────────────┐                       │
│  │  EXECUTION PHASE                     │                       │
│  │  - Send tasks to Control Center      │                       │
│  │  - Execute with /forge:forge         │                       │
│  │  - Auto-advance through queue        │                       │
│  │  - Track in WebUI                    │                       │
│  └──────────────────────────────────────┘                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
.forge/
├── state.json              # Current execution state
├── specs/                  # Specifications
│   ├── spec-001.md         # First spec
│   └── spec-002.md         # Second spec
├── plans/                  # Implementation plans
│   ├── plan-001.md         # Plan for spec-001
│   └── plan-002.md
└── tasks/                  # Task definitions
    ├── t001.yaml           # Task 1
    ├── t002.yaml           # Task 2 (depends on t001)
    ├── t003.yaml           # Task 3 (depends on t001)
    └── ...
```

## Task File Template

```yaml
# .forge/tasks/t001.yaml

id: t001
title: "Setup JWT Authentication Middleware"
description: |
  Create the core JWT authentication middleware that will be used
  across all protected API endpoints.

# Dependencies
depends_on: []              # No dependencies, can run first
blocks: [t002, t003]        # These tasks wait for this one

# Classification
type: feature               # feature | bugfix | refactor | test | docs
priority: 1                 # 1 = highest
complexity: medium          # low | medium | high

# Technical Details
technical:
  approach: |
    1. Install jsonwebtoken package
    2. Create middleware in src/middleware/auth.ts
    3. Add token verification logic
    4. Export for use in routes

  files_to_create:
    - src/middleware/auth.ts
    - src/types/auth.ts

  files_to_modify:
    - package.json
    - src/index.ts

  considerations:
    - Use RS256 for production
    - Token expiry: 1 hour
    - Refresh token: 7 days

# Success Criteria
criteria:
  - type: test-pass
    name: "Auth tests pass"
    config:
      cmd: "npm test -- --grep auth"

  - type: file-exists
    name: "Middleware exists"
    config:
      path: "src/middleware/auth.ts"

  - type: lint-clean
    name: "No lint errors"
    config:
      cmd: "npm run lint"

# Execution Config
execution:
  max_iterations: 25
  checkpoint_every: 5
  on_stuck: retry-variation
  timeout_minutes: 30

# Goals (human-readable)
goals:
  - JWT middleware authenticates requests correctly
  - Invalid tokens return 401
  - Expired tokens return 401 with specific message
  - Missing tokens return 401
  - Valid tokens attach user to request

# Status Tracking
status: pending             # pending | queued | running | completed | failed | blocked
queued_at: null
started_at: null
completed_at: null
iterations: 0
result: null

# Metadata
spec_id: spec-001
plan_id: plan-001
created_at: "2024-01-15T10:00:00Z"
created_by: forge-plan
```

## Commands

### /forge:forge-spec "GOAL"

Creates a specification through clarification:

1. Asks clarifying questions about requirements
2. Confirms understanding
3. Creates `.forge/specs/spec-XXX.md`

Output: `spec-001.md`

### /forge:forge-plan [--spec spec-001]

Creates implementation plan from spec:

1. Reads the specification
2. Designs architecture
3. Creates `.forge/plans/plan-XXX.md`
4. Decomposes into task files `.forge/tasks/tXXX.yaml`

Output: `plan-001.md` + `t001.yaml`, `t002.yaml`, ...

### /forge:forge-queue [--all | --task t001]

Sends tasks to Control Center:

1. Validates task files
2. Resolves dependencies
3. POSTs to /api/tasks in order
4. Returns queue status

### /forge:forge

Executes queued tasks with auto-advance.

## Example Flow

```bash
# Step 1: Create specification with clarification
$ /forge:forge-spec "Build a user authentication system"

Claude: I'll help you build an authentication system. Let me ask some questions:
1. What type of auth? (JWT, Session, OAuth)
2. Need refresh tokens?
3. What user fields? (email, username, password)
4. Need password reset flow?
5. Rate limiting requirements?

User: JWT with refresh, email/password, yes to reset, 5 attempts/minute

Claude: Creating specification...
✅ Created: .forge/specs/spec-001.md

# Step 2: Create plan and decompose
$ /forge:forge-plan --spec spec-001

Claude: Analyzing specification and creating implementation plan...

✅ Created: .forge/plans/plan-001.md
✅ Created tasks:
   t001: Setup JWT middleware (no deps)
   t002: Create user model (no deps)
   t003: Implement register endpoint (deps: t001, t002)
   t004: Implement login endpoint (deps: t001, t002)
   t005: Implement refresh token (deps: t004)
   t006: Implement password reset (deps: t002)
   t007: Add rate limiting (deps: t003, t004)
   t008: Write integration tests (deps: all)

# Step 3: Review and adjust (optional)
$ cat .forge/tasks/t001.yaml
$ vim .forge/tasks/t003.yaml  # Adjust if needed

# Step 4: Queue tasks
$ /forge:forge-queue --all

✅ Queued 8 tasks to Control Center
   View at: http://localhost:3344/queue

# Step 5: Execute
$ /forge:forge

🔥 Starting FORGE execution...
   Task 1/8: Setup JWT middleware
   ...
```

## WebUI Enhancements

### Spec View
- View all specifications
- See linked plans and tasks
- Track overall progress

### Plan View
- View implementation plans
- See task dependency graph
- Gantt-like timeline view

### Queue View (Enhanced)
- Show task dependencies
- Block/unblock indicators
- Progress by spec/plan
