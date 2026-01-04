import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/hooks/stop.ts", "src/cli/init.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: false,
  target: "node20",
});
