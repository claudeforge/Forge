---
description: "Sync project state with Control Center - fix stuck tasks"
allowed-tools: ["Bash", "Read"]
---

# FORGE Sync

Synchronize local project state with Control Center. Use this when:
- Tasks show as "running" but are actually finished
- Task statuses are out of sync
- You want to refresh state from server

## Your Task

When the user runs `/forge:sync`, execute the sync CLI.

## Usage

```bash
# Full sync (bidirectional)
node "$(dirname $(which claude))/../lib/plugins/forge/dist/cli/sync.js" full

# Push local state to server
node "$(dirname $(which claude))/../lib/plugins/forge/dist/cli/sync.js" push

# Pull latest from server
node "$(dirname $(which claude))/../lib/plugins/forge/dist/cli/sync.js" pull

# Process pending updates only
node "$(dirname $(which claude))/../lib/plugins/forge/dist/cli/sync.js" pending
```

## What It Does

### Push Mode
1. Reads local `.forge/` state files
2. Sends current task status to Control Center
3. Processes any pending sync queue
4. Fixes tasks that show wrong status

### Pull Mode
1. Fetches latest state from Control Center
2. Shows current queue status
3. Updates local understanding of project state

### Full Mode (Default)
- Does both push and pull
- Ensures bidirectional consistency

## Troubleshooting

### Tasks stuck as "running"
```bash
# Run full sync to push actual status
node dist/cli/sync.js full --control=http://localhost:3344 --project=YOUR_PROJECT_ID
```

### Config from .forge.json
The sync command reads `controlUrl` and `projectId` from `.forge.json` in the project root.

## Output

```
╔═══════════════════════════════════════════════════════════╗
║                     FORGE Sync                            ║
╠═══════════════════════════════════════════════════════════╣
║  Control Center: http://localhost:3344                    ║
║  Project ID:     abc-123-def                              ║
║  Mode:           full                                     ║
╚═══════════════════════════════════════════════════════════╝

[FORGE] Connected to Control Center

[FORGE] Syncing current state...
  ✓ Synced task t001 (completed)
[FORGE] Processing pending updates...
  ✓ Processed 3/3 pending updates
[FORGE] Refreshing from server...
  ✓ Fetched latest state from server
    Project: my-project
    Running: none
    Queued:  5 tasks

╔═══════════════════════════════════════════════════════════╗
║  Sync Complete ✓                                          ║
╚═══════════════════════════════════════════════════════════╝
```
