# /forge:forge-help

Display comprehensive help for the FORGE system.

## Your Task

When the user runs `/forge:forge-help`, display a well-organized help guide covering all FORGE commands and workflows.

## Help Content to Display

```
================================================================================
                           FORGE - AI Development Engine
                          Specification-Driven Development
================================================================================

QUICK START
-----------
1. Start Control Center:    npm run dev:server     (in FORGE root)
2. Register project:        /forge:forge-register "My Project"
3. Create specification:    /forge:forge-spec "feature description"
4. Create plan:             /forge:forge-plan --spec spec-001
5. Queue tasks:             /forge:forge-queue --plan plan-001
6. Execute:                 /forge:forge

COMMANDS REFERENCE
------------------

SETUP & CONNECTION
  /forge:forge-register   Register project with Control Center
                          Usage: /forge:forge-register "Project Name" [--url URL]
                          Auto-detects Control Center at http://127.0.0.1:3344

  /forge:forge-link       Link existing project to Control Center
                          Usage: /forge:forge-link [PROJECT_ID]

SPECIFICATION WORKFLOW
  /forge:forge-spec       Create specification with clarification
                          Usage: /forge:forge-spec "description" [--no-clarify]
                          - Asks 3-7 clarifying questions
                          - Explores codebase for context
                          - Creates .forge/specs/spec-NNN.md + .json

  /forge:forge-plan       Create implementation plan from specification
                          Usage: /forge:forge-plan --spec SPEC_ID [--dry-run]
                          - Analyzes specification requirements
                          - Makes architecture decisions
                          - Creates atomic task definitions (.forge/tasks/tNNN.yaml)
                          - Calculates task dependencies

QUEUE MANAGEMENT
  /forge:forge-queue      Add tasks to execution queue
                          Usage: /forge:forge-queue [options] [task-ids...]
                          Options:
                            --all           Queue all pending tasks
                            --plan PLAN_ID  Queue tasks from specific plan
                            --dry-run       Preview without queuing

  /forge:forge-request    Process pending requests from WebUI
                          Usage: /forge:forge-request [--check] [--process REQ_ID]
                          - Picks up spec requests created from WebUI
                          - Runs proper spec/plan workflow

EXECUTION
  /forge:forge            Execute tasks with iteration loop
                          Usage: /forge:forge [TASK_ID]
                          - Runs until success criteria met
                          - Auto-checkpoints for recovery
                          - Auto-advances to next task

  /forge:forge-status     Show current status
                          Usage: /forge:forge-status [--json]
                          - Current task progress
                          - Queue status
                          - Iteration metrics

CONTROL
  /forge:forge-pause      Pause current execution
  /forge:forge-resume     Resume paused execution
  /forge:forge-abort      Abort current task

CHECKPOINTS & RECOVERY
  /forge:forge-checkpoint Create manual checkpoint
                          Usage: /forge:forge-checkpoint [--name NAME]

  /forge:forge-rollback   Rollback to checkpoint
                          Usage: /forge:forge-rollback [CHECKPOINT_ID]

  /forge:forge-history    Show iteration history
                          Usage: /forge:forge-history [TASK_ID]

TASK MANAGEMENT
  /forge:forge-tasks      List and manage tasks
                          Usage: /forge:forge-tasks [--status STATUS]

  /forge:forge-adopt      Formalize WebUI tasks into spec workflow
                          Usage: /forge:forge-adopt TASK_IDs... [--create-spec]
                          - Converts quick tasks to proper specs
                          - Adds success criteria and technical details

HELP
  /forge:forge-help       Display this help message

DIRECTORY STRUCTURE
-------------------
.forge/
├── config.json           Project configuration
├── specs/                Specification documents
│   ├── spec-001.md       Detailed requirements
│   └── spec-001.json     Metadata (status, linked tasks)
├── plans/                Implementation plans
│   ├── plan-001.md       Architecture decisions
│   └── plan-001.json     Metadata (task order, progress)
├── tasks/                Task definitions (YAML)
│   ├── t001.yaml         Task with full context
│   └── t002.yaml
├── checkpoints/          Git checkpoints
└── iterations/           Iteration logs

TASK FILE FORMAT (.forge/tasks/tNNN.yaml)
-----------------------------------------
id: t001
title: "Task Title"
description: "Detailed description"
depends_on: [t000]                # Dependencies
blocks: [t002, t003]              # What this blocks
type: feature                     # feature|bugfix|refactor|test|docs|chore
priority: 1                       # Lower = higher priority
complexity: medium                # low|medium|high

technical:
  approach: "Step-by-step implementation plan"
  files_to_create:
    - src/new-file.ts
  files_to_modify:
    - src/existing.ts
  considerations:
    - "Important note"

criteria:
  - type: test-pass
    name: "Tests pass"
    config:
      cmd: "npm test"
  - type: lint-clean
    name: "No lint errors"
    config:
      cmd: "npm run lint"
  - type: file-exists
    name: "File created"
    config:
      path: "src/new-file.ts"

execution:
  max_iterations: 30
  checkpoint_every: 5
  on_stuck: retry-variation       # retry-variation|expand-context|ask-user
  timeout_minutes: 30

goals:
  - "Implement feature X"
  - "Ensure tests pass"

status: pending
spec_id: spec-001
plan_id: plan-001
source: forge-plan                # forge-plan|webui-direct|manual
needs_formalization: false

SUCCESS CRITERIA TYPES
----------------------
test-pass         Run command, expect exit code 0
lint-clean        Linting passes
build-passes      Build succeeds
file-exists       Verify file exists
code-contains     Check file contains pattern
command-output    Run command, check output

TASK SOURCES
------------
forge-plan        Created by /forge:forge-plan (proper workflow) ✓
forge-adopt       Adopted from WebUI via /forge:forge-adopt ✓
webui-direct      Created directly in WebUI (needs adoption) ⚠
webui-quick       Quick-add from WebUI (needs adoption) ⚠
api-import        Imported via API (needs adoption) ⚠
manual            Hand-written YAML file

Tasks with ⚠ should be formalized with /forge:forge-adopt before execution.

WORKFLOW EXAMPLE
----------------
1. User describes feature:
   > /forge:forge-spec "Add user authentication with JWT"

2. Claude asks clarifying questions:
   - What fields for registration? (email only, email+username, etc.)
   - Need password reset functionality?
   - Token expiry preferences?
   - Rate limiting requirements?

3. Specification created:
   .forge/specs/spec-001.md

4. Create implementation plan:
   > /forge:forge-plan --spec spec-001

5. Tasks generated:
   t001: Create PasswordService (low complexity)
   t002: Create TokenService (low complexity)
   t003: Create AuthService (high complexity, deps: t001, t002)
   t004: Create AuthMiddleware (medium complexity, deps: t002)
   t005: Create Auth Routes (medium complexity, deps: t003, t004)
   t006: Integration Tests (medium complexity, deps: t005)

6. Queue and execute:
   > /forge:forge-queue --plan plan-001
   > /forge:forge

CONTROL CENTER
--------------
Default URL:  http://127.0.0.1:3344

Dashboard:    http://127.0.0.1:3344
API:          http://127.0.0.1:3344/api

Key Endpoints:
  GET  /api/projects              List projects
  POST /api/projects              Create project
  GET  /api/projects/:id/specs    List specifications
  GET  /api/projects/:id/task-defs List task definitions
  POST /api/projects/:id/requests Create spec request from WebUI
  GET  /api/queue                 Queue status
  WS   /                          Real-time updates

TIPS
----
- Auto-register: FORGE auto-detects Control Center at 127.0.0.1:3344
- Always use specs: Use /forge:forge-spec instead of creating tasks directly
- Check status: Use /forge:forge-status to see current progress
- Formalize tasks: Use /forge:forge-adopt for WebUI-created tasks
- Set complexity: Estimate low=15, medium=25, high=35 iterations
- Dependencies: Use depends_on to control execution order
- Checkpoints: Auto-created every N iterations for recovery

TROUBLESHOOTING
---------------
"Control Center offline"  Start server: npm run dev:server
"Project not registered"  Run /forge:forge-register
"No pending tasks"        All tasks already queued/completed
"Task needs formalization" Run /forge:forge-adopt on WebUI tasks
"Task stuck"              Check on_stuck strategy, try expand-context
"Task failed"             Review criteria, check .forge/iterations/

================================================================================
```

## Display Notes

- Format the output nicely for terminal display
- Use the exact content above as reference
- Adapt formatting if needed for better readability
- The user should be able to copy commands directly
