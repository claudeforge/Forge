---
description: "Register project with FORGE Control Center"
argument-hint: '[PROJECT_NAME] [--url URL]'
allowed-tools: ["Bash(*)", "Read(*)", "Write(*)"]
---

# FORGE Register - Register Project with Control Center

Register the current project with FORGE Control Center for centralized management, monitoring, and task synchronization.

## Arguments

- `PROJECT_NAME` (optional): Name for the project. Defaults to directory name.
- `--url URL` (optional): Control Center URL. Defaults to `http://127.0.0.1:3344`

## Auto-Detection

FORGE automatically checks for Control Center at `http://127.0.0.1:3344` on startup.
If available, the project is auto-registered when you run any FORGE command.

## Process

### Step 1: Check Control Center

```bash
# Check if Control Center is running
curl -s http://127.0.0.1:3344/health
```

If not running:
```
⚠️ Control Center is not running at http://127.0.0.1:3344

Start it with:
  cd path/to/forge && npm run dev:server

Or register manually later:
  /forge:forge-register "My Project" --url http://localhost:3344
```

### Step 2: Get Project Info

```bash
# Get current directory name and path
PROJECT_PATH=$(pwd)
PROJECT_NAME=${PROJECT_NAME:-$(basename "$PROJECT_PATH")}
```

### Step 3: Register with Server

```bash
# Register project
curl -X POST http://127.0.0.1:3344/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "'"$PROJECT_NAME"'",
    "path": "'"$PROJECT_PATH"'"
  }'
```

### Step 4: Save Configuration

Create/update `.forge/config.json`:

```json
{
  "controlCenter": {
    "enabled": true,
    "url": "http://127.0.0.1:3344",
    "projectId": "proj-xxxxx",
    "projectName": "My Project",
    "registeredAt": "2024-01-15T10:00:00Z"
  },
  "autoSync": true,
  "webhooksEnabled": true
}
```

### Step 5: Confirm

```
✅ Project registered with FORGE Control Center!

Project: My Project
ID: proj-xxxxx
Path: /path/to/project
Control Center: http://127.0.0.1:3344

Features enabled:
  ✓ Real-time task monitoring
  ✓ Centralized queue management
  ✓ Token usage analytics
  ✓ Spec/Plan/Task synchronization

View in dashboard: http://127.0.0.1:3344

Next steps:
  1. Create a spec: /forge:forge-spec "Your feature description"
  2. Open dashboard: http://127.0.0.1:3344
```

## Example

```bash
# Register with default settings (auto-detects name from folder)
/forge:forge-register

# Register with custom name
/forge:forge-register "My Awesome Project"

# Register with remote Control Center
/forge:forge-register "My Project" --url http://control.myserver.com:3344
```

## What Gets Synced

Once registered, FORGE automatically syncs:

| Item | Direction | Description |
|------|-----------|-------------|
| Tasks | Plugin → Server | Task progress, iterations, results |
| Specs | Plugin → Server | Specification files from .forge/specs/ |
| Plans | Plugin → Server | Plan files from .forge/plans/ |
| Task Defs | Plugin ↔ Server | Task definitions and status |
| Metrics | Plugin → Server | Tokens, duration, files changed |
| Checkpoints | Plugin → Server | Git checkpoint references |

## Troubleshooting

### Control Center not found

```
Error: ECONNREFUSED 127.0.0.1:3344

Solutions:
1. Start Control Center: npm run dev:server
2. Check if another process uses port 3344
3. Use --url to specify different address
```

### Project already registered

If project path already exists in Control Center:
- Updates project name if different
- Keeps existing project ID
- Preserves task history

### Offline Mode

If Control Center is unavailable:
- FORGE continues to work locally
- Tasks execute normally
- Syncs automatically when connection restored
