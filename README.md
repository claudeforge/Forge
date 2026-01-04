# FORGE

**Iterative AI Development Engine for Claude Code**

FORGE transforms Claude Code into a powerful iterative development system with:

- **Multi-criteria completion** - Tests, coverage, lint, custom checks
- **Intelligent stuck detection** - Automatic recovery strategies
- **Checkpoints & rollback** - Never lose progress
- **Budget controls** - Cost and time limits
- **Control Center** - Web dashboard for monitoring
- **Task queue** - Schedule and queue multiple tasks

## Quick Start

### Install Plugin

```bash
# Add the FORGE marketplace
/plugin marketplace add claudeforge/Forge

# Install the plugin
/plugin install forge@claudeforge
```

### Start a Forge Loop

```bash
/forge "Build a REST API with user authentication" \
  --until "tests pass" \
  --until "lint clean" \
  --max-iterations 50
```

### Monitor Progress

```bash
/forge-status
```

## Control Center (Optional)

For multi-project monitoring and task queuing:

```bash
# Install and run
npx @claudeforge/forge-server

# Open dashboard
open http://localhost:3344
```

## Packages

| Package | Description |
|---------|-------------|
| [@claudeforge/forge-shared](./packages/shared) | Shared types & utilities |
| [@claudeforge/forge-plugin](./packages/plugin) | Claude Code plugin |
| [@claudeforge/forge-server](./packages/server) | Control Center API |
| [@claudeforge/forge-web](./packages/web) | Web Dashboard |

## Development

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Documentation

- [Plugin Commands](./packages/plugin/README.md)
- [Control Center API](./packages/server/README.md)
- [Configuration Guide](./docs/configuration.md)

## Repository

[https://github.com/claudeforge/Forge](https://github.com/claudeforge/Forge)

## License

MIT © ClaudeForge
