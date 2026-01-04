# 04 - Plugin Commands

> **Use this prompt to create FORGE plugin slash commands.**

---

## Command List

| Command | Description |
|---------|-------------|
| `/forge` | Start loop |
| `/forge-status` | Show current status |
| `/forge-pause` | Pause the loop |
| `/forge-resume` | Resume paused loop |
| `/forge-checkpoint` | Create manual checkpoint |
| `/forge-rollback` | Return to checkpoint |
| `/forge-abort` | Abort the loop |
| `/forge-history` | Show iteration history |

---

## Directory Structure

```
packages/plugin/commands/
├── forge.md
├── forge-status.md
├── forge-pause.md
├── forge-resume.md
├── forge-checkpoint.md
├── forge-rollback.md
├── forge-abort.md
└── forge-history.md
```

---

## commands/forge.md

Main command - Starts the FORGE loop.

```markdown
---
description: "Start a FORGE iterative development loop"
argument-hint: '"PROMPT" [--until CRITERIA]... [--max-iterations N] [OPTIONS]'
allowed-tools: ["Bash(*)"]
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
```

---

## commands/forge-status.md

```markdown
---
description: "Show current FORGE loop status"
allowed-tools: ["Bash(cat .claude/forge-state.json | head -100)"]
---

# FORGE Status

Display current forge loop status including:
- Task name and status
- Current iteration / max
- Criteria pass/fail status
- Metrics (tokens, cost, duration)
- Recent iteration history
```

---

## commands/forge-pause.md

```markdown
---
description: "Pause the current FORGE loop"
allowed-tools: ["Bash(*)"]
---

# FORGE Pause

Pause the current forge loop. The loop can be resumed later with `/forge-resume`.
```

---

## commands/forge-resume.md

```markdown
---
description: "Resume a paused FORGE loop"
allowed-tools: ["Bash(*)"]
---

# FORGE Resume

Resume a paused forge loop.
```

---

## commands/forge-checkpoint.md

```markdown
---
description: "Create a manual checkpoint"
allowed-tools: ["Bash(*)"]
---

# FORGE Checkpoint

Create a manual checkpoint of current progress.
```

---

## commands/forge-rollback.md

```markdown
---
description: "Rollback to a previous checkpoint"
argument-hint: "[CHECKPOINT_ID]"
allowed-tools: ["Bash(*)"]
---

# FORGE Rollback

Rollback to a previous checkpoint. If no ID provided, rolls back to most recent.
```

---

## commands/forge-abort.md

```markdown
---
description: "Abort the current FORGE loop"
allowed-tools: ["Bash(*)"]
---

# FORGE Abort

Stop the current forge loop immediately.
```

---

## commands/forge-history.md

```markdown
---
description: "Show FORGE iteration history"
allowed-tools: ["Bash(cat .claude/forge-state.json)"]
---

# FORGE History

Display iteration history with outcomes and summaries.
```

---

## Next Step

Move to `05-SERVER.md`.
