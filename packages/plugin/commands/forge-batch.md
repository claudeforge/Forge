---
description: "Run all queued tasks until queue is empty (batch mode)"
allowed-tools: ["Bash(*)", "Read(*)", "Write(*)", "Edit(*)", "Glob(*)", "Grep(*)", "WebFetch(*)"]
---

# FORGE Batch Mode - Process Entire Queue

You are running in **BATCH MODE**. This means you will process ALL tasks in the queue continuously until the queue is empty.

## STEP 1: Read Configuration

First, check if this directory is linked to FORGE:

```bash
cat .forge.json 2>/dev/null || echo "NOT LINKED - run /forge:forge-link first"
```

If "NOT LINKED" appears, you must first run `/forge:forge-link --project YOUR_PROJECT_ID --control http://localhost:3344`.

## STEP 2: Load Project Rules

Check if this project has defined rules:

```bash
cat .forge/rules.yaml 2>/dev/null || echo "NO_RULES"
```

If rules exist, you **MUST** follow them for ALL tasks in the batch:

- **Tech Stack**: Use ONLY the specified languages, frameworks, and libraries
- **Conventions**: Follow ALL naming, formatting, and documentation rules
- **Structure**: Place files in the CORRECT directories as defined
- **Constraints**: NEVER use forbidden libraries or patterns
- **Custom Rules**: Follow ALL custom rules defined in the project

**IMPORTANT**: Violating project rules is considered a task failure.

## STEP 3: Initialize First Task

Claim the first task from the queue:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/init.js"
```

If you see "No tasks to run", the queue is empty.

## STEP 4: Work on Current Task

Read the state file to understand your current task:

```bash
cat .forge/state.json
```

The key fields are:
- `task.prompt`: What you need to do
- `criteria.items`: What conditions must be met for completion

## CRITICAL BATCH MODE RULES

1. **NO CONFIRMATION NEEDED**: Work continuously without asking for user confirmation
2. **COMPLETE EACH TASK FULLY**: Meet all completion criteria before moving on  
3. **AUTO-ADVANCE**: When a task completes, the stop hook will automatically claim the next task
4. **CONTINUOUS WORK**: Keep working until the queue is empty
5. **NO USER INTERACTION**: Do not ask questions - make reasonable decisions autonomously

## Your Workflow for Each Task

1. Read the task prompt from `.forge/state.json`
2. Understand the requirements and criteria in `criteria.items`
3. Implement the solution completely
4. Run verification commands to check all criteria pass
5. When all criteria are satisfied and you try to exit, the stop hook will:
   - Mark the current task as complete
   - Automatically claim the next task from the queue
   - Block your exit with the new task prompt
   - You continue working on the new task

## Important Notes

- Do NOT stop between tasks - keep working
- Do NOT ask for confirmation - work autonomously
- When you successfully complete a task, the stop hook handles the transition
- You will only be allowed to exit when the queue is completely empty
- If stuck, try variations and alternative approaches before giving up

## Start Now

Run the commands in Steps 1-4 above, then begin implementing the first task!
