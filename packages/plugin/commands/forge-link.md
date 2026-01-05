---
description: "Link current directory to a FORGE project"
argument-hint: '--project ID --control URL'
allowed-tools: ["Bash(*)"]
---

# FORGE Link - Connect Directory to Project

Creates a `.forge.json` config file in the current directory to link it with a Control Center project.

## Arguments

- `--project PROJECT_ID` (required): Project ID from Control Center
- `--control URL` (required): Control Center URL

## Execute

Run the link command:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/link.js" $ARGUMENTS
```

The script will:
1. Verify connection to Control Center
2. Check if project exists
3. Create `.forge.json` config file
4. Display confirmation

After linking, you can run `/forge:forge` without `--project` and `--control` arguments.
