---
description: "Register project with FORGE Control Center"
argument-hint: '[PROJECT_NAME] [--url URL]'
allowed-tools: ["Bash(*)"]
---

# FORGE Register - Register Project with Control Center

Register the current project with FORGE Control Center for centralized management, monitoring, and task synchronization.

## Arguments

- `PROJECT_NAME` (optional): Name for the project. Defaults to directory name.
- `--url URL` (optional): Control Center URL. Defaults to `http://127.0.0.1:3344`

## Execute

Run the register command:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/register.js" $ARGUMENTS
```

The script will:
1. Check if Control Center is running
2. Register the project with the server
3. Save configuration to `.forge/config.json`
4. Display confirmation with next steps
