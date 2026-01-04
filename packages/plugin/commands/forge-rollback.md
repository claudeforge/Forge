---
description: "Rollback to a previous checkpoint"
argument-hint: "[CHECKPOINT_ID]"
allowed-tools: ["Read(.claude/forge-state.json)", "Write(.claude/forge-state.json)", "Bash(git stash apply *)"]
---

# FORGE Rollback

Rollback to a previous checkpoint.

## Arguments

- `CHECKPOINT_ID` (optional): The checkpoint ID to rollback to. If not provided, rolls back to the most recent checkpoint.

## Process

1. Read `.claude/forge-state.json`
2. Find the checkpoint:
   - If CHECKPOINT_ID provided: find matching checkpoint
   - If not provided: use the most recent checkpoint (highest iteration number)
3. If checkpoint not found, display error
4. Apply the git stash: `git stash apply <gitRef>`
5. Update state:
   - Reset `iteration.current` to checkpoint iteration
   - Remove history entries after checkpoint
   - Restore metrics from checkpoint
6. Save state file
7. Display "Rolled back to checkpoint: <id>"
