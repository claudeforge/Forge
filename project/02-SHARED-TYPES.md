# 02 - Shared Types Package

> **Use this prompt to create the `@claudeforge/forge-shared` package.**
> **This package contains types used by all other packages.**

---

## Package Structure

```
packages/shared/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── state.ts         # ForgeState main type
│   │   ├── criteria.ts      # Completion criteria types
│   │   ├── events.ts        # Webhook event types
│   │   ├── api.ts           # API request/response types
│   │   └── commands.ts      # External command types
│   ├── constants/
│   │   ├── index.ts
│   │   ├── defaults.ts      # Default values
│   │   └── paths.ts         # File paths
│   └── utils/
│       ├── index.ts
│       └── validation.ts    # Validation helpers
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## File Contents

### package.json

```json
{
  "name": "@claudeforge/forge-shared",
  "version": "0.1.0",
  "description": "Shared types and utilities for FORGE",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    },
    "./constants": {
      "types": "./dist/constants/index.d.ts",
      "import": "./dist/constants/index.js"
    },
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "import": "./dist/utils/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### tsup.config.ts

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/types/index.ts",
    "src/constants/index.ts",
    "src/utils/index.ts"
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
```

---

## Types

### src/types/state.ts

This file defines the main state structure for FORGE. Stored in `.claude/forge-state.json`.

```typescript
/**
 * FORGE State Types
 * Central state file: .claude/forge-state.json
 */

import type { CompletionCriterion, CriterionResult } from "./criteria.js";

// ============================================
// STATUS TYPES
// ============================================

/** Task status */
export type TaskStatus =
  | "running"    // Actively running
  | "paused"     // Paused
  | "completed"  // Successfully completed
  | "failed"     // Failed (budget, timeout, max-iter)
  | "stuck"      // Stuck and unrecoverable
  | "aborted";   // Manually aborted

/** Criteria evaluation mode */
export type CriteriaMode =
  | "all"       // All must pass
  | "any"       // Any one passes is OK
  | "weighted"; // Score >= requiredScore

/** Strategy when stuck */
export type StuckStrategy =
  | "retry-variation"  // Add "try different approach" to prompt
  | "simplify"         // Say "break down the task"
  | "rollback"         // Return to last checkpoint
  | "abort";           // Stop

/** Result of an iteration */
export type IterationOutcome =
  | "progress"      // Progress was made
  | "stuck"         // Stuck detected
  | "error"         // Error occurred
  | "gate-failed";  // Quality gate failed

// ... (remaining type definitions)
```

---

## Build & Test

```bash
cd packages/shared
pnpm install
pnpm build
pnpm typecheck
```

---

## Next Step

Move to `03-PLUGIN-CORE.md`.
