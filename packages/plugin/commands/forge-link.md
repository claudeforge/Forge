---
description: "Link current directory to a FORGE project"
argument-hint: '--project ID --control URL'
allowed-tools: ["Bash(*)"]
---

# FORGE Link - Connect Directory to Project

Creates a `.forge.json` config file in the current directory to link it with a Control Center project. After linking, you can run `/forge:forge` and `/forge:forge-tasks` without specifying `--project` and `--control` every time.

## Arguments

- `--project PROJECT_ID` (required): Project ID from Control Center
- `--control URL` (required): Control Center URL

## Usage

```bash
# Link current directory to a project
/forge:forge-link --project proj-abc123 --control http://127.0.0.1:3344
```

## Execution

Create the config file:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/cli/link.js" --project "$PROJECT_ID" --control "$CONTROL_URL"
```

After linking, you can simply run:

```bash
# No need for --project and --control anymore!
/forge:forge
/forge:forge-tasks "Build authentication system"
```

The config file `.forge.json` will be created with:

```json
{
  "projectId": "proj-abc123",
  "controlUrl": "http://127.0.0.1:3344"
}
```

You can commit this file to version control or add it to `.gitignore` based on your preference.
