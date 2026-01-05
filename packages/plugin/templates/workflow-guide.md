# FORGE Workflow Guide

Complete guide for specification-driven development with FORGE.

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FORGE WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. REGISTER          2. SPEC              3. PLAN                  │
│  ┌──────────┐        ┌──────────┐         ┌──────────┐             │
│  │ Project  │───────▶│ Create   │────────▶│ Create   │             │
│  │ Setup    │        │ Spec     │         │ Plan     │             │
│  └──────────┘        └──────────┘         └──────────┘             │
│       │                   │                    │                    │
│       ▼                   ▼                    ▼                    │
│  .forge/config       .forge/specs/        .forge/plans/            │
│                      spec-XXX.md          plan-XXX.md              │
│                                                │                    │
│  4. QUEUE             5. EXECUTE           6. MONITOR              │
│  ┌──────────┐        ┌──────────┐         ┌──────────┐             │
│  │ Add to   │───────▶│ Run      │────────▶│ Track    │             │
│  │ Queue    │        │ Tasks    │         │ Progress │             │
│  └──────────┘        └──────────┘         └──────────┘             │
│       │                   │                    │                    │
│       ▼                   ▼                    ▼                    │
│  .forge/tasks/       Auto-iterate         Control Center           │
│  tXXX.yaml           via stop hook        Dashboard                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Phase 1: Project Setup

### 1.1 Initialize FORGE

```bash
# Create .forge directory structure
mkdir -p .forge/{specs,plans,tasks,checkpoints,iterations}

# Register with Control Center (auto-detects if running)
/forge:forge-register "My Project"
```

**Creates:**
```
.forge/
├── config.json         # Project configuration
├── specs/              # Specifications
├── plans/              # Implementation plans
├── tasks/              # Task definitions
├── checkpoints/        # Git checkpoints
└── iterations/         # Iteration logs
```

### 1.2 Configuration

`.forge/config.json`:
```json
{
  "controlCenter": {
    "enabled": true,
    "url": "http://127.0.0.1:3344",
    "projectId": "proj-xxxxx"
  },
  "defaults": {
    "maxIterations": 30,
    "checkpointEvery": 5,
    "onStuck": "retry-variation"
  },
  "qualityGates": [
    { "name": "lint", "cmd": "npm run lint", "runEvery": 1 },
    { "name": "typecheck", "cmd": "npm run typecheck", "runEvery": 3 },
    { "name": "test", "cmd": "npm test", "runEvery": 5 }
  ]
}
```

---

## Phase 2: Specification

### 2.1 Create Specification

```bash
/forge:forge-spec "Build a user authentication system with JWT tokens"
```

### 2.2 Clarification Process

Claude will ask clarifying questions:

```
I'll help you build a user authentication system with JWT tokens.

Let me ask a few questions to understand the requirements:

**Scope:**
1. Should this include user registration, or just login?
2. Do you need password reset functionality?

**Technical:**
3. What token expiry times do you prefer? (e.g., 15min access, 7d refresh)
4. Should refresh tokens be stored in httpOnly cookies or returned in response?

**Integration:**
5. Do you have an existing user model/table?
6. What email service should we use for password reset?

**Success:**
7. What should happen on invalid credentials?
8. Any rate limiting requirements?

Please answer each question, or type "skip" for any you'd like me to decide.
```

### 2.3 Specification Output

Claude creates `.forge/specs/spec-001.md`:

```markdown
# Specification: User Authentication System

## Overview
JWT-based authentication with registration, login, and password reset.

## Requirements
### Functional Requirements
- FR-01: User registration with email/password (must-have)
- FR-02: User login with JWT tokens (must-have)
- FR-03: Password reset via email (should-have)

### Non-Functional Requirements
- NFR-01: bcrypt password hashing (security)
- NFR-02: Rate limiting on auth endpoints (security)

## Success Criteria
- [ ] All auth tests pass
- [ ] No lint errors
- [ ] Can register and login via API
```

---

## Phase 3: Planning

### 3.1 Create Implementation Plan

```bash
/forge:forge-plan --spec spec-001
```

### 3.2 Architecture Analysis

Claude:
1. Reads the specification
2. Explores existing codebase
3. Identifies patterns and conventions
4. Makes architecture decisions
5. Decomposes into tasks

### 3.3 Plan Output

Claude creates `.forge/plans/plan-001.md`:

```markdown
# Implementation Plan: User Authentication

## Architecture Decisions
1. **Token Storage**: Access in memory, refresh in httpOnly cookie
2. **Password Hashing**: bcrypt with cost factor 12
3. **Service Pattern**: Dedicated AuthService with DI

## Task Breakdown
| ID | Title | Dependencies | Complexity |
|----|-------|--------------|------------|
| t001 | PasswordService | - | low |
| t002 | TokenService | - | low |
| t003 | AuthService | t001, t002 | high |
| t004 | AuthMiddleware | t002 | medium |
| t005 | Auth Routes | t003, t004 | medium |
| t006 | Integration Tests | t005 | medium |
```

### 3.4 Task Files

Claude creates individual task files:

`.forge/tasks/t001.yaml`:
```yaml
id: t001
title: "Create PasswordService"
description: |
  Create password hashing service using bcrypt.

depends_on: []
blocks: [t003]

type: feature
priority: 1
complexity: low

technical:
  approach: |
    1. Create PasswordService class
    2. Implement hash() method
    3. Implement compare() method
    4. Add password validation
    5. Write unit tests

  files_to_create:
    - src/services/password.service.ts
    - tests/services/password.service.test.ts

  files_to_modify:
    - src/services/index.ts

criteria:
  - type: test-pass
    name: "Tests pass"
    config:
      cmd: "npm test -- --grep PasswordService"

  - type: lint-clean
    name: "No lint errors"
    config:
      cmd: "npm run lint"

execution:
  max_iterations: 15
  checkpoint_every: 5
  on_stuck: retry-variation

goals:
  - "Can hash passwords securely"
  - "Can compare passwords correctly"
  - "All tests pass"

status: pending
spec_id: spec-001
plan_id: plan-001
```

---

## Phase 4: Queue Management

### 4.1 Add Tasks to Queue

```bash
# Queue all tasks from a plan
/forge:forge-queue --plan plan-001

# Queue specific tasks
/forge:forge-queue t001 t002

# Queue with dependencies resolved
/forge:forge-queue --all --auto-order
```

### 4.2 Queue Status

```bash
/forge:forge-status
```

Output:
```
FORGE Status

Queue: 6 tasks
├── t001: PasswordService [queued] (priority: 1)
├── t002: TokenService [queued] (priority: 1)
├── t003: AuthService [blocked] → t001, t002
├── t004: AuthMiddleware [blocked] → t002
├── t005: Auth Routes [blocked] → t003, t004
└── t006: Integration Tests [blocked] → t005

Dependencies:
  t003 waiting for: t001, t002
  t004 waiting for: t002
  t005 waiting for: t003, t004
  t006 waiting for: t005

Control Center: http://127.0.0.1:3344 ✓
```

---

## Phase 5: Execution

### 5.1 Start Execution

```bash
/forge:forge
```

or start specific task:

```bash
/forge:forge t001
```

### 5.2 Execution Loop

```
┌───────────────────────────────────────────────────────────────┐
│                    FORGE EXECUTION LOOP                        │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    │
│  │  Start  │───▶│  Work   │───▶│ Claude  │───▶│  Stop   │    │
│  │  Task   │    │   on    │    │  Tries  │    │  Hook   │    │
│  └─────────┘    │  Goal   │    │ to Exit │    └────┬────┘    │
│                 └─────────┘    └─────────┘         │         │
│                                                     │         │
│                 ┌─────────────────────────────────┐│         │
│                 │      Stop Hook Checks:          ││         │
│                 │  • Criteria passed?             ││         │
│                 │  • Budget exceeded?             ││         │
│                 │  • Max iterations?              ││         │
│                 │  • Stuck detected?              ││         │
│                 └─────────────────────────────────┘│         │
│                                                     │         │
│              ┌──────────────┬──────────────────────┘         │
│              ▼              ▼                                 │
│        ┌─────────┐    ┌─────────┐                            │
│        │Complete!│    │Continue │◀──────────────────┐        │
│        │ (exit)  │    │(iterate)│                   │        │
│        └─────────┘    └────┬────┘                   │        │
│                            │                        │        │
│                            ▼                        │        │
│                      ┌─────────┐               ┌────────┐    │
│                      │ Status  │──────────────▶│  Next  │    │
│                      │ Report  │               │Iteration│   │
│                      └─────────┘               └────────┘    │
│                                                              │
└───────────────────────────────────────────────────────────────┘
```

### 5.3 Iteration Output

Each iteration shows:
```
FORGE Iteration 5

**Criteria Status:**
[PASS] TypeScript compiles (required)
[PASS] No lint errors (required)
[FAIL] Tests pass (required) → 2 failing tests
[ -- ] File exists (required)

**Metrics:**
- Tokens: 12,450
- Duration: 45s
- Progress: 5/25 iterations

Continue working on: Create PasswordService...
```

### 5.4 Completion

```
**FORGE COMPLETE!**

4/4 criteria passed
  ✓ TypeScript compiles
  ✓ No lint errors
  ✓ Tests pass
  ✓ File exists

Task t001 completed in 12 iterations
Duration: 3m 45s
Tokens: 28,500

Auto-advancing to next task: t002 TokenService
```

---

## Phase 6: Monitoring

### 6.1 Control Center Dashboard

Access at: http://127.0.0.1:3344

Features:
- Real-time task progress
- Iteration history
- Token usage analytics
- Spec/Plan/Task management
- Queue control

### 6.2 CLI Status

```bash
# Current status
/forge:forge-status

# Task history
/forge:forge-history t001

# Pause execution
/forge:forge-pause

# Resume execution
/forge:forge-resume

# Abort current task
/forge:forge-abort
```

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `/forge:forge-register` | Register project with Control Center |
| `/forge:forge-spec` | Create specification with clarification |
| `/forge:forge-plan` | Create plan and decompose into tasks |
| `/forge:forge-queue` | Add tasks to execution queue |
| `/forge:forge` | Start/continue task execution |
| `/forge:forge-status` | Show current status |
| `/forge:forge-pause` | Pause execution |
| `/forge:forge-resume` | Resume paused execution |
| `/forge:forge-abort` | Abort current task |
| `/forge:forge-checkpoint` | Create manual checkpoint |
| `/forge:forge-rollback` | Rollback to checkpoint |
| `/forge:forge-history` | Show iteration history |
| `/forge:forge-help` | Show help |

---

## Best Practices

### Writing Good Specs
- Be specific about success criteria
- List what's out of scope
- Include edge cases
- Document assumptions

### Effective Planning
- Keep tasks atomic (10-30 iterations)
- Define clear dependencies
- Include all file changes
- Set realistic complexity

### Successful Execution
- Start with foundation tasks
- Monitor for stuck patterns
- Use checkpoints for safety
- Review iteration summaries
