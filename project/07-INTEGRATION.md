# 07 - Integration & Testing

> **Use this prompt to integrate and test all packages.**

---

## Integration Checklist

### 1. Build Order

```bash
cd forge

# 1. Shared types (others depend on this)
cd packages/shared && pnpm build && cd ../..

# 2. Plugin
cd packages/plugin && pnpm build && cd ../..

# 3. Server
cd packages/server && pnpm build && cd ../..

# 4. Web
cd packages/web && pnpm build && cd ../..

# Or all at once:
pnpm build
```

### 2. Database Preparation

```bash
cd packages/server
mkdir -p data
# Tables are created automatically on first run
```

### 3. Development Mode

```bash
# Terminal 1: Server
cd packages/server && pnpm dev

# Terminal 2: Web
cd packages/web && pnpm dev

# Or from root:
pnpm dev
```

---

## Test Scenarios

### Scenario 1: Plugin Standalone

```bash
# In a test project
cd /tmp/test-project
git init
npm init -y

# Install the plugin
claude plugin add /path/to/forge/packages/plugin

# Simple loop test
/forge "Create a hello.txt file with 'Hello World'" \
  --until "file exists hello.txt" \
  --max-iterations 5

# Check status
/forge-status
```

**Expected:**
- `.claude/forge-state.json` should be created
- Loop should start
- Should complete when `hello.txt` is created

### Scenario 2: Criteria Test

```bash
/forge "Create a Node.js project with tests" \
  --until "tests pass" \
  --until "file exists package.json" \
  --max-iterations 10
```

**Expected:**
- Both criteria should be evaluated
- Should complete when all pass

### Scenario 3: Stuck Detection

```bash
/forge "Do an impossible task that will fail" \
  --until "file exists /nonexistent/impossible/path" \
  --max-iterations 10 \
  --on-stuck "abort"
```

**Expected:**
- Stuck detection should trigger after 3-5 iterations
- Should be aborted

### Scenario 4: Control Center Connection

```bash
# Start the server
cd packages/server && pnpm dev

# In another terminal
cd /tmp/test-project
/forge "Build something" \
  --until "tests pass" \
  --control "http://localhost:3344"
```

**Expected:**
- Task should appear in dashboard
- Real-time updates should come through

### Scenario 5: Queue

```bash
# Via Web UI or API:
curl -X POST http://localhost:3344/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","path":"/tmp/test-project"}'

curl -X POST http://localhost:3344/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"projectId":"...","name":"Task 1","prompt":"Do task 1"}'

curl -X POST http://localhost:3344/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"projectId":"...","name":"Task 2","prompt":"Do task 2"}'

# Start the queue
curl -X POST http://localhost:3344/api/queue/run-next
```

**Expected:**
- Tasks should run sequentially

---

## Troubleshooting

### Plugin not loading

```bash
# Check plugin directory
ls -la packages/plugin/.claude-plugin/
ls -la packages/plugin/hooks/

# Check build output
ls -la packages/plugin/dist/
```

### Stop hook not working

```bash
# Test hook manually
echo '{"transcript_path":"/tmp/test.jsonl"}' | node packages/plugin/dist/hooks/stop.js

# Is it executable?
file packages/plugin/dist/hooks/stop.js
```

### State file corrupted

```bash
# Delete and restart
rm -rf .claude/forge-*
```

### WebSocket not connecting

```bash
# Check server logs
# Check CORS issues
# Check if port is open
curl http://localhost:3344/health
```

---

## NPM Publish

### Order

1. `@claudeforge/forge-shared`
2. `@claudeforge/forge-plugin`
3. `@claudeforge/forge-server`
4. `@claudeforge/forge-web`

### Commands

```bash
# Login
npm login

# For each package
cd packages/shared
npm version patch
npm publish --access public

# Or use changeset
pnpm changeset
pnpm changeset version
pnpm changeset publish
```

---

## README Updates

Each package README should have:

- [ ] Installation
- [ ] Quick start
- [ ] API/Commands documentation
- [ ] Examples
- [ ] Configuration options
- [ ] License

---

## Final Checklist

- [ ] `pnpm install` runs without errors
- [ ] `pnpm build` builds all packages
- [ ] `pnpm dev` starts server and web
- [ ] Plugin loads into Claude Code
- [ ] `/forge "test"` command works
- [ ] Stop hook triggers
- [ ] Criteria evaluation works
- [ ] Stuck detection works
- [ ] Checkpoint is created
- [ ] Control Center dashboard opens
- [ ] WebSocket real-time updates work
- [ ] Task queue is functional

---

## Next Steps (Post-MVP)

1. **Templates repo**: Ready-made criteria/task templates
2. **VS Code extension**: IDE integration
3. **Cloud Control Center**: Self-hosted → cloud option
4. **Team features**: Multi-user, permissions
5. **Plugin marketplace**: Custom criteria types
6. **AI improvements**: Smarter stuck detection, auto-fix suggestions
