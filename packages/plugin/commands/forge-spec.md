---
description: "Create a specification through guided clarification"
argument-hint: '"GOAL" [--no-clarify]'
allowed-tools: ["Bash(*)", "Read(*)", "Glob(*)", "Grep(*)", "Write(*)"]
---

# FORGE Spec - Create Specification

Create a specification for a development goal through guided clarification. This is the first step in the Specification-Driven Development workflow.

## Arguments

- `GOAL` (required): High-level description of what you want to build
- `--no-clarify`: Skip clarification questions (use for simple, well-defined goals)

## Process

### Step 1: Gather Full Context

Before anything else, gather comprehensive context.

#### 1.1 Load Project Rules
```bash
cat .forge/rules.yaml 2>/dev/null || echo "NO_RULES"
```

#### 1.2 Analyze Codebase Structure
```bash
# Tech stack detection
ls package.json pyproject.toml Cargo.toml go.mod 2>/dev/null

# Directory structure
find . -type d -maxdepth 3 ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" 2>/dev/null | head -25

# Key source files related to GOAL
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.py" -o -name "*.go" \) ! -path "*/node_modules/*" 2>/dev/null | head -40
```

#### 1.3 Review Existing Specs
```bash
# Check existing specs to avoid duplication
for f in .forge/specs/*.json; do [ -f "$f" ] && cat "$f"; done 2>/dev/null

# Read recent spec patterns
ls -t .forge/specs/*.md 2>/dev/null | head -2 | xargs head -40 2>/dev/null
```

#### 1.4 Find Related Code
Search for code related to GOAL keywords:
```bash
grep -r "KEYWORD" --include="*.ts" --include="*.py" -l . 2>/dev/null | grep -v node_modules | head -15
```

Read the most relevant files found.

**IMPORTANT**: All decisions MUST comply with project rules, follow existing patterns, and not duplicate existing specs.

### Step 2: Understand the Goal

With context gathered, analyze:
- What already exists related to this goal?
- What gaps need to be filled?
- Unclear requirements (not already in rules)
- Scope ambiguities

### Step 3: Clarification (unless --no-clarify)

Ask the user 3-7 focused questions to clarify:

1. **Scope**: What exactly is included/excluded?
2. **Technical**: What technologies, patterns, or constraints?
3. **Integration**: How does this fit with existing code?
4. **Success**: How do we know when it's done?
5. **Priority**: What's most important if we can't do everything?

Format questions with context found:
```
I'll help you build [GOAL].

**Context Found:**
- Tech stack: [from rules/package.json]
- Related code: [key files found]
- Related specs: [if any exist]

**Questions:**

1. [Scope question]
2. [Integration question - based on existing code found]
3. [Technical question - only if not in rules]
...

Answer each, or "skip" for me to decide.
```

Wait for user response before proceeding.

### Step 4: Explore Codebase

After clarification, explore the existing codebase:

```bash
# Find relevant files
# Understand current architecture
# Identify integration points
```

### Step 5: Create Specification

Create the specification file:

```bash
# Ensure directory exists
mkdir -p .forge/specs

# Find next spec number
EXISTING=$(ls .forge/specs/*.md 2>/dev/null | wc -l)
SPEC_NUM=$(printf "%03d" $((EXISTING + 1)))
SPEC_ID="spec-${SPEC_NUM}"
```

Write `.forge/specs/spec-XXX.md`:

```markdown
# Specification: [Title]

## Overview
[Brief description of what this specification covers]

## Context Analysis

### Related Existing Code
- `[file.ts]`: [What it does, how this spec relates]
- `[dir/]`: [Relevant directory]

### Related Specs
- `spec-XXX`: [Relationship/overlap if any]
- None found (if no related specs)

## Requirements

### Functional Requirements
- FR1: [Requirement]
- FR2: [Requirement]

### Non-Functional Requirements
- NFR1: [Performance, security, etc.]

## Technical Approach
[High-level technical decisions and architecture]

**Project Rules Applied**: [Reference .forge/rules.yaml if exists]
- Tech Stack: [from rules]
- Conventions: [key conventions]
- Constraints: [constraints that apply]

## Integration Points
- `[existing-file.ts]`: [How to integrate]
- `[existing-module/]`: [Integration approach]

## Success Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Out of Scope
[Explicitly excluded items]

## Open Questions
[Any remaining uncertainties]

---
Created: [timestamp]
Status: draft
```

Write `.forge/specs/spec-XXX.json` (metadata):

```json
{
  "id": "spec-XXX",
  "title": "[Title]",
  "description": "[Brief description]",
  "status": "draft",
  "plan_id": null,
  "task_ids": [],
  "created_at": "[timestamp]",
  "approved_at": null,
  "completed_at": null,
  "total_tasks": 0,
  "completed_tasks": 0,
  "failed_tasks": 0,
  "related_specs": ["spec-YYY"],
  "related_files": ["src/file.ts", "src/module/"]
}
```

### Step 6: Confirm

Output confirmation:

```
✅ Specification created: .forge/specs/spec-XXX.md

Summary:
- Title: [Title]
- Requirements: [count] functional, [count] non-functional
- Success criteria: [count]

Next steps:
1. Review the specification: cat .forge/specs/spec-XXX.md
2. Edit if needed: vim .forge/specs/spec-XXX.md
3. Create implementation plan: /forge:forge-plan --spec spec-XXX
```

## Example

```bash
/forge:forge-spec "Add user authentication with JWT"
```

Claude:
1. Reads `.forge/rules.yaml` → Tech stack: Node.js + Express
2. Scans codebase → Finds `routes/`, `middleware/`, `models/User.ts`
3. Checks specs → `spec-002` covers user registration
4. Searches for auth → Finds existing `middleware/session.ts`

Then asks:
```
I'll help you add JWT authentication.

**Context Found:**
- Tech stack: Node.js + Express + TypeScript (from rules)
- Related code: routes/, middleware/session.ts, models/User.ts
- Related spec: spec-002 (user registration)

**Questions:**

1. Should JWT replace the existing session middleware or work alongside it?
2. spec-002 created User model with email/password - should JWT use the same?
3. Do you need refresh tokens for long sessions?
4. Any specific token expiry requirements?

Answer each, or "skip" for me to decide.
```

User responds, Claude creates context-aware specification with proper integration points.
