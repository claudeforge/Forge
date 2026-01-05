---
description: "Decompose a large task into smaller sub-tasks and send to queue"
argument-hint: '"GOAL" --project ID --control URL [--template TEMPLATE]'
allowed-tools: ["Bash(*)", "Read(*)", "Glob(*)", "Grep(*)"]
---

# FORGE Tasks - Task Decomposition

Analyze a high-level goal, break it into smaller executable sub-tasks, and send them to the Control Center queue for review and execution.

## Arguments

- `GOAL` (required): The high-level task/goal to decompose
- `--project PROJECT_ID`: Project ID to add tasks to (optional if linked via .forge.json)
- `--control URL`: Control Center URL (optional if linked via .forge.json)
- `--template TEMPLATE`: Task template (feature|bugfix|refactor|test)
- `--max-tasks N`: Maximum number of sub-tasks (default: 10)

**Tip**: Run `/forge:forge-link` first to save project config, then you won't need `--project` and `--control` flags.

## Process

1. **Analyze the Goal**: Understand the scope and requirements
2. **Explore Codebase**: Read relevant files to understand context
3. **Decompose**: Break into 3-10 atomic, executable sub-tasks
4. **Send to Queue**: POST each task to Control Center

## Task Decomposition Guidelines

Each sub-task should be:
- **Atomic**: Completable in a single iteration loop (5-20 iterations)
- **Testable**: Has clear success criteria
- **Independent**: Minimal dependencies on other tasks
- **Ordered**: Respects logical dependencies (foundations first)

## Examples

```bash
# If linked via /forge:forge-link - simple!
/forge-tasks "Add user authentication with JWT"

# With template
/forge-tasks "Fix the checkout flow bug" --template bugfix

# Or with explicit project/control (if not linked)
/forge-tasks "Add user authentication with JWT" \
  --project proj-abc123 \
  --control http://localhost:3344
```

## Task Templates

### feature (default)
1. Setup/scaffolding tasks
2. Core implementation tasks
3. Integration tasks
4. Testing tasks

### bugfix
1. Reproduce/identify the bug
2. Implement fix
3. Add regression tests

### refactor
1. Identify code to refactor
2. Create new structure
3. Migrate existing code
4. Update tests
5. Clean up old code

### test
1. Analyze coverage gaps
2. Add unit tests
3. Add integration tests

## Execution

First, analyze the goal and codebase to understand context:

```bash
# Read relevant files, explore structure
```

Then, decompose into sub-tasks. For each sub-task, determine:
- Task name (short, descriptive)
- Prompt (detailed instructions)
- Success criteria (tests pass, lint clean, etc.)
- Max iterations (typically 10-30)

Finally, send tasks to the queue:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/add-tasks.js" \
  --project "$PROJECT_ID" \
  --control "$CONTROL_URL" \
  --tasks-json '$TASKS_JSON'
```

Where `$TASKS_JSON` is a JSON array of tasks:

```json
[
  {
    "name": "Setup auth middleware",
    "prompt": "Create JWT authentication middleware...",
    "criteria": ["Tests Pass"],
    "maxIterations": 20
  },
  {
    "name": "Add login endpoint",
    "prompt": "Implement POST /api/auth/login...",
    "criteria": ["Tests Pass", "Lint Clean"],
    "maxIterations": 25
  }
]
```

After sending, print a summary and remind the user to review tasks in the WebUI before running `/forge:forge`.
