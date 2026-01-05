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

## CRITICAL: Task Scope Restrictions

**YOU MUST FOLLOW THESE RULES STRICTLY:**

### 1. NO TodoWrite Tool Usage
- **DO NOT** use the TodoWrite tool during task execution
- The task definition already defines what needs to be done

### 2. NO Scope Expansion
- **DO NOT** add features beyond the task definition
- **DO NOT** refactor unrelated code
- If something seems missing, that's for the NEXT task

### 3. Task Boundaries Are Absolute
- The task prompt defines your ENTIRE scope
- The criteria define your ONLY success conditions
- When the criteria are met, THE TASK IS DONE

### 4. Continuation = Next Task in Queue
- **DO NOT** self-expand work
- Each task is atomic and self-contained

**VIOLATION OF THESE RULES IS CONSIDERED A TASK FAILURE.**
