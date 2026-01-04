# 01 - Project Setup

> **Use this prompt to create the monorepo structure and root configuration files.**

---

## Task Summary

Create the following:
1. Root `package.json` (workspace)
2. `pnpm-workspace.yaml`
3. `turbo.json` (Turborepo config)
4. `tsconfig.base.json`
5. `.gitignore`
6. `.prettierrc`
7. `README.md`
8. Package directories (empty)

---

## File Contents

### 1. package.json

```json
{
  "name": "forge",
  "version": "0.0.0",
  "private": true,
  "description": "FORGE - Iterative AI Development Engine for Claude Code",
  "repository": {
    "type": "git",
    "url": "https://github.com/claudeforge/forge.git"
  },
  "author": "ClaudeForge",
  "license": "MIT",
  "type": "module",
  "scripts": {
    "dev": "turbo dev",
    "dev:server": "turbo dev --filter=@claudeforge/forge-server",
    "dev:web": "turbo dev --filter=@claudeforge/forge-web",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\""
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "prettier": "^3.1.0",
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### 2. pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
```

### 3. turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 4. tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 5. .gitignore

```gitignore
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
*.tsbuildinfo

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Test coverage
coverage/

# Turbo
.turbo/

# Database
*.db
*.sqlite
data/

# FORGE state files (in projects)
.claude/forge-state.json
.claude/forge-command.json
.claude/forge-checkpoints/
```

### 6. .prettierrc

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### 7. README.md

```markdown
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

\`\`\`bash
claude plugin add @claudeforge/forge-plugin
\`\`\`

### Start a Forge Loop

\`\`\`bash
/forge "Build a REST API with user authentication" \\
  --until "tests pass" \\
  --until "lint clean" \\
  --max-iterations 50
\`\`\`

### Monitor Progress

\`\`\`bash
/forge-status
\`\`\`

## Control Center (Optional)

For multi-project monitoring and task queuing:

\`\`\`bash
# Install and run
npx @claudeforge/forge-server

# Open dashboard
open http://localhost:3344
\`\`\`

## Packages

| Package | Description |
|---------|-------------|
| [@claudeforge/forge-shared](./packages/shared) | Shared types & utilities |
| [@claudeforge/forge-plugin](./packages/plugin) | Claude Code plugin |
| [@claudeforge/forge-server](./packages/server) | Control Center API |
| [@claudeforge/forge-web](./packages/web) | Web Dashboard |

## Development

\`\`\`bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
\`\`\`

## Documentation

- [Plugin Commands](./packages/plugin/README.md)
- [Control Center API](./packages/server/README.md)
- [Configuration Guide](./docs/configuration.md)

## License

MIT © ClaudeForge
\`\`\`

---

## Directories to Create

```
packages/
├── shared/
├── plugin/
├── server/
└── web/
```

Put an empty `.gitkeep` file in each directory.

---

## Verification

After setup:

```bash
# Check structure
ls -la
ls -la packages/

# Install pnpm (if not present)
pnpm install

# Is turbo working?
pnpm turbo --version
```

---

## Next Step

Move to `02-SHARED-TYPES.md`.
