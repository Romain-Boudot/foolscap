import { defineConfig } from "vitest/config";

// Unit tests (math evaluator, parsers, checklist, ephemeral helpers) run in a
// plain Node environment — none of them touch the DOM or the Electron bridge.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
