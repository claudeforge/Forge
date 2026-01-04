---
description: "Start a FORGE iterative development loop"
argument-hint: '"PROMPT" [--until CRITERIA]... [--max-iterations N] [OPTIONS]'
allowed-tools: ["Bash(*)", "Read(*)", "Write(*)", "Edit(*)"]
---

# FORGE - Start Iterative Loop

Parse arguments and initialize the forge state file.

## Arguments

- `PROMPT` (required): The task description
- `--until CRITERIA`: Completion criterion (can be used multiple times)
- `--name NAME`: Task name (default: derived from prompt)
- `--max-iterations N`: Maximum iterations (default: unlimited)
- `--max-cost AMOUNT`: Maximum cost in USD (e.g., "$5")
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

```bash
# Simple loop
/forge "Build a REST API" --until "tests pass" --max-iterations 30

# Multiple criteria
/forge "Add authentication" \
  --until "tests pass" \
  --until "lint clean" \
  --until "coverage > 80%" \
  --max-iterations 50

# With budget controls
/forge "Refactor database layer" \
  --until "tests pass" \
  --max-cost "$3" \
  --max-duration 1800 \
  --checkpoint-every 5

# With Control Center
/forge "Build dashboard" \
  --until "tests pass" \
  --control "http://localhost:3344"
```

## Initialization

When this command is invoked:

1. Parse all arguments from $ARGUMENTS
2. Generate a unique task ID
3. Build criteria array from --until flags
4. Create `.claude/forge-state.json` with full state structure
5. Output confirmation message
6. Begin working on the task

The stop hook will automatically evaluate progress on each exit attempt.

After initialization, immediately start working on the task described in the PROMPT.
