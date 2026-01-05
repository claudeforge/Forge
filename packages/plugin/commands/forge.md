---
description: "Start a FORGE iterative development loop"
argument-hint: '[--project ID --control URL] | ["PROMPT" --until CRITERIA]...'
allowed-tools: ["Bash(*)", "Read(*)", "Write(*)", "Edit(*)"]
---

# FORGE - Start Iterative Loop

Parse arguments and initialize the forge state file. Can work in two modes:
1. **Server-driven**: Fetch task from Control Center queue (`--project` + `--control`)
2. **Command-line**: Provide task via arguments (traditional mode)

## Arguments

### Server-Driven Mode (Recommended)
- `--project PROJECT_ID`: Project ID to fetch queued tasks from
- `--control URL`: Control Center URL (required with --project)

### Command-Line Mode
- `PROMPT` (required): The task description
- `--until CRITERIA`: Completion criterion (can be used multiple times)
- `--name NAME`: Task name (default: derived from prompt)
- `--max-iterations N`: Maximum iterations (default: unlimited)
- `--max-duration SECONDS`: Maximum duration
- `--checkpoint-every N`: Auto-checkpoint interval (default: 10)
- `--on-stuck STRATEGY`: Recovery strategy (retry-variation|simplify|rollback|abort)
- `--gate COMMAND`: Quality gate command (can be used multiple times)
- `--control URL`: Control Center URL for monitoring

## Criteria Shortcuts

- `"tests pass"` → Runs `npm test`, expects exit 0
- `"lint clean"` → Runs `npm run lint`, expects no errors
- `"coverage > N%"` → Runs coverage, expects ≥N%
- `"file exists PATH"` → Checks if file exists
- Any other string → Promise criterion (looks for `<promise>TEXT</promise>`)

## Examples

### Server-Driven Mode (Queue-based)

```bash
# Fetch and run next task from project queue
/forge --project proj-abc123xyz --control http://localhost:3344

# The plugin will:
# 1. Claim the next queued task from the project
# 2. Get all task config (prompt, criteria, limits) from the server
# 3. Execute the task until completion
# 4. Server can auto-advance to next task in queue
```

### Command-Line Mode (Traditional)

```bash
# Simple loop
/forge "Build a REST API" --until "tests pass" --max-iterations 30

# Multiple criteria
/forge "Add authentication" \
  --until "tests pass" \
  --until "lint clean" \
  --until "coverage > 80%" \
  --max-iterations 50

# With duration limit
/forge "Refactor database layer" \
  --until "tests pass" \
  --max-duration 1800 \
  --checkpoint-every 5

# With Control Center monitoring
/forge "Build dashboard" \
  --until "tests pass" \
  --control "http://localhost:3344"
```

## Initialization

First, run the initialization script to create state and notify Control Center:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/init.js" $ARGUMENTS
```

The stop hook will automatically evaluate progress on each exit attempt.

After initialization, immediately start working on the task described in the PROMPT.
