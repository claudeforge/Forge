---
description: "Show current FORGE loop status, specs, and plans"
allowed-tools: ["Read", "Glob", "Bash"]
---

# FORGE Status

Display comprehensive FORGE status including specifications, plans, and task execution.

## Your Task

When the user runs `/forge:forge-status`, gather and display information from multiple sources.

## Information to Display

### 1. Active Task (if running)

Read `.claude/forge-state.json` and display:

- **Task Info**
  - Name and ID
  - Status (running/paused/completed/failed/stuck/aborted)
  - Original prompt (first 100 chars)
  - Spec/Plan references if linked

- **Progress**
  - Current iteration / max iterations
  - Time elapsed
  - Tokens used

- **Criteria Status**
  - List each criterion with pass/fail indicator
  - Current value vs target value

- **Recent History**
  - Last 5 iterations with outcome and summary

### 2. Specification Overview

Check `.forge/specs/` directory for spec files:

```
SPECIFICATIONS
--------------
ID          Title                           Status        Tasks
spec-001    User Authentication             completed     6/6
spec-002    API Rate Limiting               in_progress   3/5
spec-003    Dashboard Redesign              draft         0/0
```

For each spec, read the JSON metadata file to get status and task counts.

### 3. Plan Overview

Check `.forge/plans/` directory for plan files:

```
PLANS
-----
ID          Spec        Status        Progress
plan-001    spec-001    completed     6/6 tasks
plan-002    spec-002    executing     3/5 tasks
```

### 4. Task Queue Summary

Check `.forge/tasks/` directory for task YAML files:

```
TASKS
-----
Status      Count
pending     12
queued      5
running     1
blocked     2
completed   8
failed      1
```

List any blocked tasks with their blockers.

### 5. Control Center Status

If `.forge.json` exists and has controlUrl:
- Attempt to check `/api/queue/status`
- Show if Control Center is connected
- Display queue length

## Display Format

```
================================================================================
                              FORGE Status
================================================================================

ACTIVE TASK
-----------
  ID:         abc123
  Name:       t003: Create auth middleware
  Status:     running
  Iteration:  12 / 30
  Duration:   5m 23s
  Tokens:     45,320
  Spec:       spec-001
  Plan:       plan-001

  Criteria:
    [PASS] TypeScript compiles
    [PASS] Tests pass (24/24)
    [FAIL] Coverage > 80% (current: 72%)

--------------------------------------------------------------------------------

SPECIFICATIONS (3)
------------------
  spec-001    User Authentication          completed     6/6 tasks
  spec-002    API Rate Limiting            in_progress   3/5 tasks
  spec-003    Dashboard Redesign           draft         -

PLANS (2)
---------
  plan-001    spec-001    completed     6/6 tasks
  plan-002    spec-002    executing     3/5 tasks

TASK SUMMARY
------------
  pending: 12  |  queued: 5  |  running: 1  |  completed: 8  |  failed: 1

  Blocked tasks:
    t007: Waiting for t005, t006
    t010: Waiting for t009

CONTROL CENTER
--------------
  URL:        http://localhost:3456
  Status:     Connected
  Queue:      5 tasks pending

================================================================================
```

## Notes

- If no `.claude/forge-state.json` exists, show "No active task"
- If `.forge/` directories don't exist, show "No specifications/plans created"
- Handle missing files gracefully
- Use colors/formatting appropriate for terminal
