---
description: "Create a manual checkpoint"
allowed-tools: ["Write(.claude/forge-command.json)", "Bash(git add -A)", "Bash(git stash push -m *)"]
---

# FORGE Checkpoint

Create a manual checkpoint of current progress.

1. Write command file:

```json
{
  "command": "checkpoint",
  "timestamp": "<current ISO timestamp>"
}
```

2. Create git stash:
   - `git add -A`
   - `git stash push -m "forge-manual-checkpoint-<timestamp>"`

3. Output: "Manual checkpoint created"

The checkpoint will be recorded in the state file by the stop hook.
