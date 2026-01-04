import { defineConfig } from "tsup";

export default defineConfig([
  // Setup CLI - needs shebang for npx
  {
    entry: { "cli/setup": "src/cli/setup.ts" },
    format: ["esm"],
    dts: false,
    clean: true,
    sourcemap: false,
    target: "node20",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
  // Other files - no shebang (called via node explicitly)
  {
    entry: ["src/hooks/stop.ts", "src/cli/init.ts"],
    format: ["esm"],
    dts: false,
    clean: false, // Don't clean, setup.ts already built
    sourcemap: false,
    target: "node20",
  },
]);
