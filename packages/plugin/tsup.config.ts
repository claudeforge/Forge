import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/hooks/stop.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: false,
  target: "node20",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
