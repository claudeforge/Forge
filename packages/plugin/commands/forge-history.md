---
description: "Show FORGE iteration history"
allowed-tools: ["Read(.claude/forge-state.json)"]
---

# FORGE History

Display the complete iteration history for the current task.

Read `.claude/forge-state.json` and display:

## For each iteration in `iteration.history`:

| # | Outcome | Duration | Summary |
|---|---------|----------|---------|
| 1 | progress | 45s | Created initial project structure |
| 2 | progress | 32s | Added user model and tests |
| 3 | gate-failed | 28s | Tests failing, lint errors |
| ... | ... | ... | ... |

## Summary Statistics

- Total iterations: N
- Success rate: X%
- Total duration: X minutes
- Total tokens: X

If no `.claude/forge-state.json` exists or history is empty, display appropriate message.
