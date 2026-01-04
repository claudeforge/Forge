---
description: "Pause the current FORGE loop"
allowed-tools: ["Write(.claude/forge-command.json)"]
---

# FORGE Pause

Pause the current forge loop. The loop can be resumed later with `/forge-resume`.

Write the following to `.claude/forge-command.json`:

```json
{
  "command": "pause",
  "timestamp": "<current ISO timestamp>"
}
```

The stop hook will read this file and pause the loop on the next exit attempt.

Output: "FORGE will pause after current iteration"
