---
description: "Queue task files to Control Center for execution"
argument-hint: '--all | --task TASK_ID | --plan PLAN_ID'
allowed-tools: ["Bash(*)", "Read(*)"]
---

# FORGE Queue - Send Tasks to Control Center

Parse task definition files (YAML) and send them to the Control Center queue for execution.

## Arguments

- `--all`: Queue all pending tasks
- `--task TASK_ID`: Queue specific task (e.g., t001)
- `--plan PLAN_ID`: Queue all tasks from a plan
- `--dry-run`: Show what would be queued without sending

## Prerequisites

Project must be linked to Control Center:
```bash
# Check if linked
cat .forge.json
```

If not linked, run `/forge:forge-link` first.

## Process

### Step 1: Load Configuration

```bash
# Load project config
CONFIG=$(cat .forge.json)
PROJECT_ID=$(echo $CONFIG | jq -r '.projectId')
CONTROL_URL=$(echo $CONFIG | jq -r '.controlUrl')
```

### Step 2: Find Tasks to Queue

Based on arguments:

**--all**: Find all pending tasks
```bash
# List all task files
ls .forge/tasks/*.yaml
```

**--task TASK_ID**: Queue specific task
```bash
# Read specific task
cat .forge/tasks/${TASK_ID}.yaml
```

**--plan PLAN_ID**: Queue tasks from plan
```bash
# Read plan metadata
TASK_IDS=$(cat .forge/plans/${PLAN_ID}.json | jq -r '.task_ids[]')
```

### Step 3: Resolve Dependencies

For each task:
1. Check if dependencies are satisfied (completed or being queued together)
2. Determine execution order
3. Assign priorities based on dependency depth

```
t001 (no deps)      → priority: 0
t002 (deps: t001)   → priority: 1
t003 (deps: t001)   → priority: 1
t004 (deps: t002, t003) → priority: 2
```

### Step 4: Validate Tasks

For each task, verify:
- Required fields present (id, title, description, criteria)
- Dependencies reference valid task IDs
- Criteria are properly formatted

Report any validation errors before proceeding.

### Step 5: Send to Control Center

Use the CLI tool to send tasks:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/queue-tasks.js" \
  --project "$PROJECT_ID" \
  --control "$CONTROL_URL" \
  --tasks "$TASK_FILES"
```

For each task, POST to `/api/tasks`:

```json
{
  "projectId": "proj-xxx",
  "name": "t001: [Title]",
  "prompt": "[Full task prompt with description, approach, goals]",
  "priority": 0,
  "config": {
    "criteria": [...],
    "maxIterations": 25,
    "taskDefId": "t001",
    "specId": "spec-001",
    "planId": "plan-001",
    "dependencies": [],
    "technical": {...}
  }
}
```

### Step 6: Update Local Status

Update task files with queued status:

```yaml
status: queued
queued_at: "2024-01-15T10:00:00Z"
```

Update plan metadata:
```json
{
  "status": "executing",
  "started_at": "2024-01-15T10:00:00Z"
}
```

### Step 7: Confirm

Output summary:

```
✅ Tasks queued to Control Center!

Queued 5 tasks:
  t001: [Title] (priority: 0)
  t002: [Title] (priority: 1, deps: t001)
  t003: [Title] (priority: 1, deps: t001)
  t004: [Title] (priority: 2, deps: t002, t003)
  t005: [Title] (priority: 3, deps: t004)

Execution order:
  t001 → [t002, t003] → t004 → t005

View queue: http://localhost:3344/queue

Next steps:
1. Review queue in WebUI
2. Reorder if needed
3. Start execution: /forge:forge
```

## Task Prompt Generation

When sending to Control Center, generate a comprehensive prompt:

```markdown
# Task: [ID] - [Title]

## Description
[Full description from task file]

## Technical Approach
[Approach from task file]

## Files to Create
- [file1]
- [file2]

## Files to Modify
- [file1]
- [file2]

## Considerations
- [consideration1]
- [consideration2]

## Goals
- [goal1]
- [goal2]

## Success Criteria
This task is complete when:
- Tests pass
- Lint clean
- [other criteria]

---
Spec: [spec_id]
Plan: [plan_id]
Dependencies: [deps]
Max Iterations: [max]
```

## Example

```bash
# Queue all pending tasks
/forge:forge-queue --all

# Queue specific task
/forge:forge-queue --task t003

# Queue all tasks from a plan
/forge:forge-queue --plan plan-001

# Preview without sending
/forge:forge-queue --all --dry-run
```
