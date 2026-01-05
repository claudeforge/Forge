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

### Step 1: Load Project Rules

First, check if this project has defined rules:

```bash
cat .forge/rules.yaml 2>/dev/null || echo "NO_RULES"
```

If rules exist, you MUST follow them throughout the specification. The rules define:
- Tech stack (languages, frameworks, databases)
- Code conventions (naming, formatting, documentation)
- Project structure (directories, patterns)
- Constraints (forbidden libraries, required patterns)
- Custom rules

**IMPORTANT**: All requirements and technical decisions in the specification MUST comply with these project rules.

### Step 2: Understand the Goal

Read the GOAL and identify what needs clarification:
- Unclear requirements
- Missing technical decisions (that aren't already defined in rules)
- Scope ambiguities
- Success criteria

### Step 3: Clarification (unless --no-clarify)

Ask the user 3-7 focused questions to clarify:

1. **Scope**: What exactly is included/excluded?
2. **Technical**: What technologies, patterns, or constraints?
3. **Integration**: How does this fit with existing code?
4. **Success**: How do we know when it's done?
5. **Priority**: What's most important if we can't do everything?

Format questions clearly:
```
I'll help you build [GOAL]. Let me ask a few questions to understand the requirements:

1. [Question about scope]
2. [Question about technical approach]
3. [Question about integration]
...

Please answer each question, or type "skip" for any you'd like me to decide.
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

## Requirements

### Functional Requirements
- FR1: [Requirement]
- FR2: [Requirement]

### Non-Functional Requirements
- NFR1: [Performance, security, etc.]

## Technical Approach
[High-level technical decisions and architecture]

**Project Rules Applied**: [Reference .forge/rules.yaml if exists, otherwise "None defined"]
- Tech Stack: [List technologies from rules that apply]
- Conventions: [Key conventions that must be followed]
- Constraints: [Any constraints that affect this spec]

## Integration Points
[How this integrates with existing code]

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
  "failed_tasks": 0
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
/forge:forge-spec "Build a user authentication system with JWT"
```

Claude asks:
```
I'll help you build a user authentication system with JWT. Let me ask a few questions:

1. What user fields do you need? (email only, email+username, phone, etc.)
2. Do you need refresh tokens for long-lived sessions?
3. Should we include password reset functionality?
4. Any rate limiting requirements for login attempts?
5. Do you need role-based access control (RBAC)?
6. What's the token expiry time preference?

Please answer each question, or type "skip" for any you'd like me to decide.
```

User responds, Claude creates specification.
