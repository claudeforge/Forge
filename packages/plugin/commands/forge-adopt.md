---
description: "Adopt WebUI tasks into spec/plan structure"
argument-hint: 'TASK_ID... [--spec SPEC_ID] [--create-spec]'
allowed-tools: ["Bash(*)", "Read(*)", "Glob(*)", "Grep(*)", "Write(*)"]
---

# FORGE Adopt - Formalize WebUI Tasks

Convert quick/ad-hoc tasks created from WebUI into proper spec/plan/task structure.

## Why?

Tasks created directly in WebUI lack:
- Clarification and requirement analysis
- Architectural decisions
- Proper dependency mapping
- Success criteria definition
- Integration with spec-driven workflow

This command "adopts" WebUI tasks and creates proper specifications for them.

## Arguments

- `TASK_ID...` (required): One or more task IDs to adopt (e.g., t001 t002)
- `--spec SPEC_ID`: Add to existing specification
- `--create-spec`: Create new specification from tasks

## Task Sources

Tasks can come from different sources:

| Source | Created By | Has Spec? | Recommended Action |
|--------|------------|-----------|-------------------|
| `forge-plan` | Plugin workflow | Yes | Already proper |
| `webui-direct` | WebUI form | No | Run forge-adopt |
| `webui-quick` | WebUI quick add | No | Run forge-adopt |
| `api-import` | External API | No | Run forge-adopt |
| `manual` | Hand-written YAML | Maybe | Verify and link |

## Process

### Step 0: Load Project Rules

First, check if this project has defined rules:

```bash
cat .forge/rules.yaml 2>/dev/null || echo "NO_RULES"
```

If rules exist, all adopted tasks and their specifications MUST comply with:
- **Tech Stack**: Only use specified technologies
- **Conventions**: Follow naming and formatting rules
- **Structure**: Place files in correct directories
- **Constraints**: Respect forbidden patterns

### Step 1: Load WebUI Tasks

```bash
# Find tasks without spec_id
ls .forge/tasks/*.yaml | while read f; do
  if grep -q 'spec_id: null' "$f" || grep -q 'created_by: webui' "$f"; then
    echo "$f"
  fi
done
```

### Step 2: Analyze Tasks

Read each task and understand:
- What is the overall goal?
- Are these related or independent?
- What's the logical grouping?

### Step 3: Create Specification

If `--create-spec`:

```markdown
# Specification: [Derived Title]

## Overview
[Derived from task descriptions]

## Requirements
[Extracted from task goals]

## Tasks Being Adopted
- t001: [Title]
- t002: [Title]

## Original Source
These tasks were created in WebUI and formalized via forge-adopt.
Original creation: [dates]
```

### Step 4: Create Plan

If creating new spec:

```markdown
# Implementation Plan: [Title]

## Architecture Decisions
[Derived from task technical approaches]

## Task Mapping
| Original ID | New ID | Title | Changes |
|-------------|--------|-------|---------|
| t001 | t101 | [Title] | Added criteria, deps |
| t002 | t102 | [Title] | Added technical spec |
```

### Step 5: Update Tasks

For each adopted task:

```yaml
# Before
id: t001
title: "Add login feature"
description: "Make login work"
created_by: webui-direct
spec_id: null
plan_id: null
criteria: []

# After
id: t101                          # New ID in spec sequence
title: "Implement login endpoint with JWT authentication"
description: |
  Create login endpoint that validates credentials
  and returns JWT tokens.

  Adopted from WebUI task t001.

created_by: forge-adopt           # Shows adoption
original_id: t001                 # Reference to original
spec_id: spec-003
plan_id: plan-003

criteria:
  - type: test-pass
    name: "Login tests pass"
    config:
      cmd: "npm test -- --grep login"
  - type: lint-clean
    name: "No lint errors"
    config:
      cmd: "npm run lint"

technical:
  approach: |
    1. Create POST /auth/login endpoint
    2. Validate email/password
    3. Generate JWT token
    4. Return token in response
```

### Step 6: Report

```
✅ Tasks adopted into spec-driven workflow!

Created:
  - Specification: .forge/specs/spec-003.md
  - Plan: .forge/plans/plan-003.md

Adopted Tasks:
  t001 → t101: "Add login feature" → "Implement login endpoint"
    + Added 3 success criteria
    + Added technical approach
    + Linked to spec-003

  t002 → t102: "Add logout" → "Implement logout and token invalidation"
    + Added 2 success criteria
    + Added dependency on t101
    + Linked to spec-003

Next steps:
  1. Review spec: cat .forge/specs/spec-003.md
  2. Review plan: cat .forge/plans/plan-003.md
  3. Queue tasks: /forge:forge-queue --plan plan-003
```

## Example

```bash
# Adopt single task, create new spec
/forge:forge-adopt t001 --create-spec

# Adopt multiple related tasks
/forge:forge-adopt t001 t002 t003 --create-spec

# Add task to existing spec
/forge:forge-adopt t005 --spec spec-001
```

## Best Practices

1. **Group related tasks** - Adopt related WebUI tasks together into one spec
2. **Add clarification** - Claude should ask questions to fill gaps
3. **Define criteria** - Every adopted task needs measurable success criteria
4. **Set dependencies** - Identify and set proper task dependencies
5. **Review before queue** - Always review adopted tasks before executing
