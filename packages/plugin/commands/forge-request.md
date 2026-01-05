---
description: "Process pending requests from Control Center"
argument-hint: '[--check] [--process REQUEST_ID]'
allowed-tools: ["Bash(*)", "Read(*)", "Glob(*)", "Grep(*)", "Write(*)"]
---

# FORGE Request - Process Control Center Requests

Check and process pending requests created from the WebUI Control Center.
This enables WebUI users to request specs/plans that Claude Code will create properly.

## Why?

Instead of creating tasks directly (which bypass the spec workflow), WebUI users can:
1. Submit a "spec request" from the dashboard
2. Claude Code picks up the request via `/forge:forge-request`
3. Claude runs the full clarification + spec + plan + task workflow
4. Result: Properly structured, high-quality task definitions

## Arguments

- `--check`: Check for pending requests without processing
- `--process REQUEST_ID`: Process a specific request

## Request Types

| Type | Description | Triggers |
|------|-------------|----------|
| `spec` | Create new specification | forge-spec workflow |
| `plan` | Create plan for existing spec | forge-plan workflow |
| `adopt` | Formalize WebUI tasks | forge-adopt workflow |
| `clarify` | Answer questions about spec | Interactive Q&A |

## Request Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   WebUI     │────▶│   Server    │────▶│ Claude Code │
│  Dashboard  │     │  (Queue)    │     │  (Plugin)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
   User creates       Stores in           /forge-request
   spec request       requests table      picks up & runs
                                          forge-spec
```

## Process

### Step 1: Check for Requests

```bash
# Fetch pending requests from Control Center
curl -s http://127.0.0.1:3344/api/projects/${PROJECT_ID}/requests?status=pending
```

Response:
```json
{
  "requests": [
    {
      "id": "req-001",
      "type": "spec",
      "title": "User authentication system",
      "description": "Build JWT auth with registration and login",
      "priority": "high",
      "created_at": "2024-01-15T10:00:00Z",
      "created_by": "webui",
      "status": "pending"
    }
  ]
}
```

### Step 2: Display Pending Requests

```
📬 Pending Requests from Control Center

┌────────────────────────────────────────────────────────────┐
│ REQ-001 [spec] HIGH                                        │
│ Title: User authentication system                          │
│ Description: Build JWT auth with registration and login    │
│ Created: 2024-01-15 10:00:00                               │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ REQ-002 [adopt] MEDIUM                                     │
│ Title: Formalize WebUI tasks                               │
│ Tasks: t045, t046, t047                                    │
│ Created: 2024-01-15 11:30:00                               │
└────────────────────────────────────────────────────────────┘

Process a request:
  /forge:forge-request --process req-001

Or process all:
  /forge:forge-request --process-all
```

### Step 3: Process Request

For `type: spec`:
```
Processing REQ-001: User authentication system

→ Starting spec creation workflow...
→ This will run the full /forge:forge-spec flow with clarification.

[forge-spec workflow starts]
```

For `type: adopt`:
```
Processing REQ-002: Formalize WebUI tasks

→ Starting task adoption workflow...
→ This will run /forge:forge-adopt for tasks: t045, t046, t047

[forge-adopt workflow starts]
```

### Step 4: Update Request Status

```bash
# Mark request as completed
curl -X POST http://127.0.0.1:3344/api/requests/${REQUEST_ID}/complete \
  -H "Content-Type: application/json" \
  -d '{"result": {"spec_id": "spec-005", "task_ids": ["t101", "t102"]}}'
```

### Step 5: Report

```
✅ Request REQ-001 processed successfully!

Created:
  - Specification: spec-005
  - Plan: plan-005
  - Tasks: t101, t102, t103, t104

Request status updated in Control Center.
```

## Example

```bash
# Check for pending requests
/forge:forge-request --check

# Process specific request
/forge:forge-request --process req-001

# Process all pending requests
/forge:forge-request --process-all
```

## WebUI Integration

WebUI should provide:

### 1. Request Spec Button
Instead of "Add Task", show "Request Spec" which:
- Opens a form for goal description
- Optionally adds priority and notes
- Creates a pending request for Claude Code

### 2. Request Status View
Show pending requests and their status:
- Pending (waiting for Claude Code)
- Processing (Claude Code is working on it)
- Completed (spec/plan/tasks created)
- Failed (needs attention)

### 3. Formalize Tasks Button
For tasks with `needs_formalization: true`:
- Show a "Formalize" button
- Creates an adopt request
- Claude Code will run forge-adopt
