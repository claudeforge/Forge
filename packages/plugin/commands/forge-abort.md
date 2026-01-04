---
description: "Abort the current FORGE loop"
allowed-tools: ["Write(.claude/forge-command.json)"]
---

# FORGE Abort

Stop the current forge loop immediately.

Write the following to `.claude/forge-command.json`:

```json
{
  "command": "abort",
  "timestamp": "<current ISO timestamp>",
  "reason": "user request"
}
```

The stop hook will read this file and abort the loop on the next exit attempt.

Output: "FORGE will abort after current iteration"
