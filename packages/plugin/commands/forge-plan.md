---
description: "Create implementation plan and decompose into tasks"
argument-hint: '--spec SPEC_ID [--dry-run]'
allowed-tools: ["Bash(*)", "Read(*)", "Glob(*)", "Grep(*)", "Write(*)"]
---

# FORGE Plan - Create Implementation Plan & Tasks

Read a specification and create an implementation plan, then decompose it into atomic task files.

## Arguments

- `--spec SPEC_ID` (required): Specification ID (e.g., spec-001)
- `--dry-run`: Show plan without creating files

## Process

### Step 1: Load Project Rules & Specification

First, load project rules (if defined):

```bash
# Load project rules
cat .forge/rules.yaml 2>/dev/null || echo "NO_RULES"

# Read the specification
cat .forge/specs/${SPEC_ID}.md
cat .forge/specs/${SPEC_ID}.json
```

If rules exist, ALL architectural decisions and task implementations MUST comply with:
- **Tech Stack**: Use only the specified languages, frameworks, and libraries
- **Conventions**: Follow naming, formatting, and documentation rules
- **Structure**: Place files in the correct directories
- **Constraints**: Respect forbidden libraries/patterns

Understand from spec:
- Requirements (functional & non-functional)
- Technical approach
- Success criteria
- Integration points

### Step 2: Analyze Codebase

Explore the codebase to understand:
- Current architecture
- Existing patterns
- File structure
- Dependencies

### Step 3: Design Architecture

Make key technical decisions:
- Component structure
- Data flow
- API design
- File organization

### Step 4: Create Implementation Plan

Write `.forge/plans/plan-XXX.md`:

```markdown
# Implementation Plan: [Title]

Spec: spec-XXX

## Architecture Decisions

1. **[Decision Area]**: [Decision and rationale]
2. **[Decision Area]**: [Decision and rationale]

## Component Design

### [Component 1]
- Purpose: [What it does]
- Location: [File path]
- Dependencies: [What it needs]

### [Component 2]
...

## Data Flow

[Describe how data flows through the system]

## Task Breakdown

| ID | Title | Dependencies | Complexity |
|----|-------|--------------|------------|
| t001 | [Title] | - | low |
| t002 | [Title] | t001 | medium |
| t003 | [Title] | t001, t002 | high |

## Execution Order

1. t001 - [Title] (foundation)
2. t002 - [Title] (depends on t001)
3. t003 - [Title] (depends on t001, t002)
...

## Risk Assessment

- **[Risk]**: [Mitigation]

---
Created: [timestamp]
Spec: spec-XXX
Status: draft
```

### Step 5: Create Task Files

For each task, create `.forge/tasks/tXXX.yaml`:

```yaml
id: t001
title: "[Descriptive title]"
description: |
  [Detailed description of what this task accomplishes]

depends_on: []
blocks: [t002, t003]

type: feature  # feature | bugfix | refactor | test | docs
priority: 1
complexity: medium  # low | medium | high

# Project rules reference (if .forge/rules.yaml exists)
rules_applied:
  tech_stack: true      # Must use specified technologies
  conventions: true     # Must follow naming/formatting rules
  structure: true       # Must place files in correct directories
  constraints: true     # Must respect forbidden patterns

technical:
  approach: |
    1. [Step 1]
    2. [Step 2]
    3. [Step 3]

  files_to_create:
    - path/to/new/file.ts

  files_to_modify:
    - path/to/existing/file.ts

  considerations:
    - [Important consideration]

criteria:
  - type: test-pass
    name: "Tests pass"
    config:
      cmd: "npm test"

  - type: lint-clean
    name: "No lint errors"
    config:
      cmd: "npm run lint"

execution:
  max_iterations: 25
  checkpoint_every: 5
  on_stuck: retry-variation
  timeout_minutes: 30

goals:
  - [Goal 1 in human terms]
  - [Goal 2 in human terms]

status: pending
queued_at: null
started_at: null
completed_at: null
iterations: 0
result: null

spec_id: spec-XXX
plan_id: plan-XXX
created_at: "[timestamp]"
created_by: forge-plan
```

### Step 6: Update Metadata

Update spec metadata with linked plan:
```json
{
  "plan_id": "plan-XXX",
  "task_ids": ["t001", "t002", "t003", ...]
}
```

Create plan metadata `.forge/plans/plan-XXX.json`:
```json
{
  "id": "plan-XXX",
  "title": "[Title]",
  "spec_id": "spec-XXX",
  "status": "draft",
  "decisions": ["Decision 1", "Decision 2"],
  "task_ids": ["t001", "t002", "t003"],
  "task_order": ["t001", "t002", "t003"],
  "created_at": "[timestamp]",
  "started_at": null,
  "completed_at": null,
  "total_tasks": 3,
  "completed_tasks": 0,
  "current_task": null
}
```

### Step 7: Confirm

Output confirmation:

```
✅ Implementation plan created!

Plan: .forge/plans/plan-XXX.md
Spec: spec-XXX

Tasks created:
  t001: [Title] (no deps, low complexity)
  t002: [Title] (deps: t001, medium complexity)
  t003: [Title] (deps: t001, t002, high complexity)

Execution order:
  1. t001 → 2. t002 → 3. t003

Total estimated iterations: ~75

Next steps:
1. Review plan: cat .forge/plans/plan-XXX.md
2. Review tasks: ls .forge/tasks/
3. Edit if needed: vim .forge/tasks/t001.yaml
4. Queue for execution: /forge:forge-queue --all
```

## Task Decomposition Guidelines

### Atomic Tasks
Each task should be completable in 10-30 iterations:
- **Too big**: "Implement authentication" → Split into register, login, refresh, etc.
- **Too small**: "Add import statement" → Combine with related work
- **Just right**: "Create JWT middleware with tests"

### Dependencies
- List explicit dependencies in `depends_on`
- Tasks with no deps can run in parallel (future)
- Avoid circular dependencies

### Success Criteria
Each task MUST have measurable criteria:
- Tests pass
- Lint clean
- File exists
- Specific functionality works

### Complexity Estimation
- **low**: < 15 iterations, simple changes
- **medium**: 15-25 iterations, moderate complexity
- **high**: 25-40 iterations, complex logic

## Example

```bash
/forge:forge-plan --spec spec-001
```

Creates:
- `.forge/plans/plan-001.md`
- `.forge/plans/plan-001.json`
- `.forge/tasks/t001.yaml`
- `.forge/tasks/t002.yaml`
- `.forge/tasks/t003.yaml`
- ...
