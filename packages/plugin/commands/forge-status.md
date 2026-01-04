---
description: "Show current FORGE loop status"
allowed-tools: ["Read(.claude/forge-state.json)"]
---

# FORGE Status

Display the current forge loop status.

Read the `.claude/forge-state.json` file and display:

1. **Task Info**
   - Name
   - Status (running/paused/completed/failed/stuck/aborted)
   - Original prompt (first 100 chars)

2. **Progress**
   - Current iteration / max iterations
   - Time elapsed
   - Estimated cost

3. **Criteria Status**
   - List each criterion with pass/fail indicator
   - Current value vs target value

4. **Recent History**
   - Last 5 iterations with outcome and summary

5. **Checkpoints**
   - Number of available checkpoints

If no `.claude/forge-state.json` exists, display "No active FORGE loop".
