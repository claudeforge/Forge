---
description: "Resume a paused FORGE loop"
allowed-tools: ["Read(.claude/forge-state.json)", "Write(.claude/forge-state.json)"]
---

# FORGE Resume

Resume a paused forge loop.

1. Read `.claude/forge-state.json`
2. Check if status is "paused"
3. If not paused, display error message
4. If paused:
   - Update status to "running"
   - Update `iteration.currentStartedAt` to current timestamp
   - Save the state file
   - Display "FORGE resumed"
   - Continue working on the original task prompt from state

After resuming, immediately continue working on `state.task.prompt`.
