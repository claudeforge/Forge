---
description: "Mark current FORGE task as complete"
allowed-tools: ["Bash(*)"]
---

# FORGE Done - Mark Task Complete

Use this command when you have completed the current task and want to explicitly signal completion.

## Usage

Write a completion command to the FORGE command file:

```bash
echo '{"command":"complete"}' > .forge/command.json
```

This will:
1. Mark the current task as completed
2. Sync completion status to Control Center
3. Auto-advance to the next queued task (if any)

## When to Use

- When all task requirements are met
- When you've verified your implementation works
- When criteria checks might not capture your completion

## Note

After running this, the stop hook will process the command and either:
- Start the next queued task (batch mode)
- Allow exit (no more tasks)
