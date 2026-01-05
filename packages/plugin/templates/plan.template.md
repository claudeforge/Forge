# Implementation Plan: {{TITLE}}

> Plan ID: {{PLAN_ID}}
> Spec: {{SPEC_ID}}
> Created: {{CREATED_AT}}
> Status: {{STATUS}}

## Executive Summary

{{SUMMARY}}

## Architecture Decisions

### AD-1: {{DECISION_TITLE}}
- **Decision**: {{DECISION}}
- **Rationale**: {{RATIONALE}}
- **Alternatives Considered**: {{ALTERNATIVES}}
- **Trade-offs**: {{TRADEOFFS}}

### AD-2: {{DECISION_TITLE}}
- **Decision**: {{DECISION}}
- **Rationale**: {{RATIONALE}}
- **Alternatives Considered**: {{ALTERNATIVES}}
- **Trade-offs**: {{TRADEOFFS}}

## Component Design

### Component: {{COMPONENT_NAME}}

**Purpose**: {{PURPOSE}}

**Location**: `{{FILE_PATH}}`

**Interface**:
```typescript
{{INTERFACE_CODE}}
```

**Dependencies**:
- {{DEPENDENCY}}

**Notes**: {{NOTES}}

---

### Component: {{COMPONENT_NAME}}

**Purpose**: {{PURPOSE}}

**Location**: `{{FILE_PATH}}`

**Interface**:
```typescript
{{INTERFACE_CODE}}
```

## Data Flow

```
{{DATA_FLOW_DIAGRAM}}

Example:
User Input → Validation → Service → Repository → Database
         ↓
    Error Handler
         ↓
    Response Formatter
         ↓
    API Response
```

## File Structure

```
{{PROJECT_ROOT}}/
├── {{FOLDER}}/
│   ├── {{FILE}} ← {{DESCRIPTION}}
│   ├── {{FILE}} ← {{DESCRIPTION}}
│   └── {{SUBFOLDER}}/
│       └── {{FILE}} ← {{DESCRIPTION}}
```

## Task Breakdown

### Overview

| ID | Title | Type | Deps | Complexity | Est. Iterations |
|----|-------|------|------|------------|-----------------|
| t001 | {{TITLE}} | feature | - | low | 10-15 |
| t002 | {{TITLE}} | feature | t001 | medium | 15-25 |
| t003 | {{TITLE}} | feature | t001,t002 | high | 25-35 |
| t004 | {{TITLE}} | test | t001,t002,t003 | medium | 15-20 |

### Task Details

#### t001: {{TITLE}}
- **Description**: {{DESCRIPTION}}
- **Dependencies**: None (foundation task)
- **Complexity**: low
- **Files to create**:
  - `{{FILE_PATH}}`
- **Files to modify**:
  - `{{FILE_PATH}}`
- **Success criteria**:
  - Tests pass
  - No lint errors
  - {{SPECIFIC_CRITERION}}

#### t002: {{TITLE}}
- **Description**: {{DESCRIPTION}}
- **Dependencies**: t001
- **Complexity**: medium
- **Files to create**:
  - `{{FILE_PATH}}`
- **Files to modify**:
  - `{{FILE_PATH}}`
- **Success criteria**:
  - Tests pass
  - No lint errors
  - {{SPECIFIC_CRITERION}}

## Dependency Graph

```
t001 (Foundation)
  │
  ├──→ t002 (Feature A)
  │       │
  │       └──→ t004 (Tests)
  │
  └──→ t003 (Feature B)
          │
          └──→ t004 (Tests)
```

## Execution Order

### Phase 1: Foundation
1. **t001** - {{TITLE}} (no dependencies, can start immediately)

### Phase 2: Core Features
2. **t002** - {{TITLE}} (after t001 completes)
3. **t003** - {{TITLE}} (after t001 completes, parallel with t002)

### Phase 3: Integration & Tests
4. **t004** - {{TITLE}} (after t002, t003 complete)

## Risk Assessment

| Risk | Probability | Impact | Mitigation | Contingency |
|------|-------------|--------|------------|-------------|
| {{RISK}} | medium | high | {{MITIGATION}} | {{CONTINGENCY}} |

## Quality Gates

| Gate | Trigger | Command | Action on Fail |
|------|---------|---------|----------------|
| Lint | every iteration | `npm run lint` | auto-fix |
| Type Check | every 3 iterations | `npm run typecheck` | block |
| Tests | every 5 iterations | `npm test` | block |
| Build | before complete | `npm run build` | block |

## Estimated Effort

| Metric | Estimate |
|--------|----------|
| Total Tasks | {{COUNT}} |
| Total Iterations | {{COUNT}} |
| Estimated Duration | {{DURATION}} |
| Parallel Opportunities | {{COUNT}} tasks |

---

## Metadata

```json
{
  "id": "{{PLAN_ID}}",
  "title": "{{TITLE}}",
  "spec_id": "{{SPEC_ID}}",
  "status": "{{STATUS}}",
  "decisions": [
    "{{DECISION_1}}",
    "{{DECISION_2}}"
  ],
  "task_ids": ["t001", "t002", "t003", "t004"],
  "task_order": ["t001", "t002", "t003", "t004"],
  "created_at": "{{CREATED_AT}}",
  "started_at": null,
  "completed_at": null
}
```
