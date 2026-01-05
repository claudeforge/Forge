import { describe, it, expect } from "vitest";
import { generateIterationSummary } from "./summary.js";

describe("Summary Generation", () => {
  describe("generateIterationSummary", () => {
    it("should extract line with action keyword", async () => {
      const output = `Created a new function for handling errors
More text here
`;
      const result = await generateIterationSummary(output);

      expect(result).toContain("Created");
    });

    it("should extract line with 'added' keyword", async () => {
      const output = `Added a new test file for the component`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Added a new test file for the component");
    });

    it("should extract line with 'fixed' keyword", async () => {
      const output = `Fixed the bug in authentication flow`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Fixed the bug in authentication flow");
    });

    it("should extract line with 'implemented' keyword", async () => {
      const output = `I implemented the new feature`;
      const result = await generateIterationSummary(output);

      expect(result).toContain("implemented");
    });

    it("should skip lines starting with 'I '", async () => {
      const output = `
I need to check something first
Created the new module
`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Created the new module");
    });

    it("should skip lines starting with 'Let me'", async () => {
      const output = `
Let me think about this
Updated the configuration
`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Updated the configuration");
    });

    it("should skip lines starting with 'I'll'", async () => {
      const output = `
I'll work on this next
Refactored the database layer
`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Refactored the database layer");
    });

    it("should truncate long lines to 100 characters", async () => {
      const longAction = "Implemented " + "a".repeat(150);
      const result = await generateIterationSummary(longAction);

      expect(result.length).toBeLessThanOrEqual(103); // 100 + "..."
      expect(result.endsWith("...")).toBe(true);
    });

    it("should fallback to first line if no action found", async () => {
      const output = `This is just some random text
Without any action keywords
`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("This is just some random text");
    });

    it("should handle empty output", async () => {
      const result = await generateIterationSummary("");

      expect(result).toBe("No output");
    });

    it("should clean bullet point prefixes", async () => {
      const output = `• Created a new component`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Created a new component");
    });

    it("should clean dash prefixes", async () => {
      const output = `- Fixed the issue`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Fixed the issue");
    });

    it("should clean asterisk prefixes", async () => {
      const output = `* Updated the docs`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Updated the docs");
    });

    it("should handle 'completed' keyword", async () => {
      const output = `Completed the migration to v2`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Completed the migration to v2");
    });

    it("should handle 'configured' keyword", async () => {
      const output = `Configured the build pipeline`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Configured the build pipeline");
    });

    it("should handle 'installed' keyword", async () => {
      const output = `Installed the required dependencies`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Installed the required dependencies");
    });

    it("should handle 'set up' keyword", async () => {
      const output = `Set up the testing framework`;
      const result = await generateIterationSummary(output);

      expect(result).toBe("Set up the testing framework");
    });
  });
});
