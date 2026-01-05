/**
 * Tests for Project Rules Loader
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadProjectRules, formatRulesForPrompt, getRulesSection } from "./rules.js";
import type { ProjectRules } from "@claudeforge/forge-shared";

// Mock fs
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { existsSync, readFileSync } from "node:fs";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

describe("Project Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadProjectRules", () => {
    it("should return null when rules file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadProjectRules("/project");

      expect(result).toBeNull();
      expect(mockExistsSync).toHaveBeenCalled();
      // Path separators vary by OS, just check the call was made with expected parts
      const callArg = mockExistsSync.mock.calls[0]?.[0] as string;
      expect(callArg).toContain(".forge");
      expect(callArg).toContain("rules.yaml");
    });

    it("should load and parse rules file when it exists", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`
name: Test Project
description: A test project
techStack:
  language:
    primary: TypeScript
    version: "5.0"
    strict: true
`);

      const result = loadProjectRules("/project");

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Test Project");
      expect(result?.description).toBe("A test project");
      expect(result?.techStack?.language?.primary).toBe("TypeScript");
    });

    it("should return null and log error on parse failure", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Read error");
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = loadProjectRules("/project");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[FORGE] Failed to load project rules:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should use current working directory when no path provided", () => {
      mockExistsSync.mockReturnValue(false);

      loadProjectRules();

      expect(mockExistsSync).toHaveBeenCalled();
    });
  });

  describe("formatRulesForPrompt", () => {
    // Note: These tests use partial objects cast to ProjectRules because
    // the formatter handles partial data from YAML files gracefully

    it("should format basic rules with name and description", () => {
      const rules = {
        name: "Test Project",
        description: "A test description",
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("## Project Rules: Test Project");
      expect(result).toContain("A test description");
    });

    it("should format rules without description", () => {
      const rules = {
        name: "Test Project",
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("## Project Rules: Test Project");
    });

    it("should format tech stack section with all fields", () => {
      const rules = {
        name: "Test",
        techStack: {
          language: {
            primary: "TypeScript",
            version: "5.0",
            strict: true,
          },
          runtime: {
            name: "Node.js",
            version: "20",
          },
          framework: {
            name: "React",
            version: "18",
            variant: "Next.js",
          },
          styling: {
            approach: "CSS-in-JS",
            library: "styled-components",
          },
          database: {
            type: "PostgreSQL",
            orm: "Drizzle",
          },
          api: {
            style: "REST",
            validation: "Zod",
          },
          testing: {
            framework: "Vitest",
            e2e: "Playwright",
            coverage: 80,
          },
          build: {
            packageManager: "pnpm",
          },
          state: {
            library: "Zustand",
            serverState: "React Query",
          },
        },
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("### Tech Stack (MUST USE)");
      expect(result).toContain("**Language**: TypeScript 5.0 (strict mode)");
      expect(result).toContain("**Runtime**: Node.js 20");
      expect(result).toContain("**Framework**: React 18 (Next.js)");
      expect(result).toContain("**Styling**: CSS-in-JS with styled-components");
      expect(result).toContain("**Database**: PostgreSQL with Drizzle");
      expect(result).toContain("**API Style**: REST with Zod validation");
      expect(result).toContain("**Testing**: Vitest, E2E: Playwright (80% coverage required)");
      expect(result).toContain("**Package Manager**: pnpm");
      expect(result).toContain("**State Management**: Zustand, React Query");
    });

    it("should format tech stack with minimal fields", () => {
      const rules = {
        name: "Test",
        techStack: {
          language: {
            primary: "JavaScript",
          },
          runtime: {
            name: "Node.js",
          },
          framework: {
            name: "Express",
          },
          styling: {
            approach: "CSS",
          },
          database: {
            type: "SQLite",
          },
          api: {
            style: "REST",
          },
          testing: {
            framework: "Jest",
          },
        },
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("**Language**: JavaScript");
      expect(result).toContain("**Runtime**: Node.js");
      expect(result).toContain("**Framework**: Express");
      expect(result).toContain("**Styling**: CSS");
      expect(result).toContain("**Database**: SQLite");
      expect(result).toContain("**API Style**: REST");
      expect(result).toContain("**Testing**: Jest");
    });

    it("should format conventions section", () => {
      const rules = {
        name: "Test",
        conventions: {
          fileNaming: "kebab-case",
          componentNaming: "PascalCase",
          functionStyle: "arrow",
          exportStyle: "named",
          formatting: {
            indentSize: 2,
            indentStyle: "spaces",
            quotes: "double",
            semicolons: true,
            trailingComma: "all",
          },
          documentation: {
            style: "jsdoc",
            required: "public",
          },
          errorHandling: {
            style: "try-catch",
          },
        },
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("### Code Conventions (MUST FOLLOW)");
      expect(result).toContain("**File Naming**: kebab-case");
      expect(result).toContain("**Component Naming**: PascalCase");
      expect(result).toContain("**Function Style**: arrow functions");
      expect(result).toContain("**Export Style**: named exports");
      expect(result).toContain("**Formatting**: 2 spaces, double quotes, with semicolons, all trailing commas");
      expect(result).toContain("**Documentation**: jsdoc style, public functions");
      expect(result).toContain("**Error Handling**: try-catch");
    });

    it("should format conventions without optional fields", () => {
      const rules = {
        name: "Test",
        conventions: {
          fileNaming: "camelCase",
          functionStyle: "declaration",
          exportStyle: "default",
        },
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("**File Naming**: camelCase");
      expect(result).toContain("**Function Style**: declaration functions");
      expect(result).toContain("**Export Style**: default exports");
    });

    it("should format project structure section", () => {
      const rules = {
        name: "Test",
        structure: {
          srcDir: "src",
          directories: {
            components: "components",
            utils: "utils",
            hooks: "hooks",
          },
          featureBased: true,
          monorepo: {
            tool: "turborepo",
            packages: "packages/*",
          },
        },
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("### Project Structure");
      expect(result).toContain("**Source Directory**: src/");
      expect(result).toContain("**Directories**:");
      expect(result).toContain("**Structure**: Feature-based organization");
      expect(result).toContain("**Monorepo**: turborepo (packages in packages/*)");
    });

    it("should format structure without optional fields", () => {
      const rules = {
        name: "Test",
        structure: {
          srcDir: "lib",
          directories: {},
        },
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("**Source Directory**: lib/");
    });

    it("should format constraints section", () => {
      const rules = {
        name: "Test",
        constraints: {
          forbidden: {
            libraries: ["moment", "lodash"],
            patterns: ["any type", "class components"],
            practices: ["inline styles", "console.log in production"],
          },
          required: {
            patterns: ["error boundaries", "loading states"],
            practices: ["code review", "unit tests"],
          },
          security: {
            noSecrets: true,
            sanitization: true,
            csp: true,
          },
          accessibility: {
            required: true,
            level: "AAA",
          },
        },
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("### Constraints (MUST RESPECT)");
      expect(result).toContain("**Forbidden Libraries**: moment, lodash");
      expect(result).toContain("**Forbidden Patterns**: any type, class components");
      expect(result).toContain("**Forbidden Practices**: inline styles, console.log in production");
      expect(result).toContain("**Required Patterns**: error boundaries, loading states");
      expect(result).toContain("**Required Practices**: code review, unit tests");
      expect(result).toContain("**Security**: no hardcoded secrets, input sanitization required, CSP headers required");
      expect(result).toContain("**Accessibility**: WCAG AAA compliance required");
    });

    it("should format accessibility without level", () => {
      const rules = {
        name: "Test",
        constraints: {
          accessibility: {
            required: true,
          },
        },
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("**Accessibility**: WCAG AA compliance required");
    });

    it("should format custom rules", () => {
      const rules = {
        name: "Test",
        customRules: [
          "Always use semantic HTML",
          "Never use !important in CSS",
          "Document all API changes",
        ],
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("### Custom Rules (MUST FOLLOW)");
      expect(result).toContain("1. Always use semantic HTML");
      expect(result).toContain("2. Never use !important in CSS");
      expect(result).toContain("3. Document all API changes");
    });

    it("should handle empty constraints", () => {
      const rules = {
        name: "Test",
        constraints: {
          security: {
            noSecrets: false,
            sanitization: false,
            csp: false,
          },
        },
      } as ProjectRules;

      const result = formatRulesForPrompt(rules);

      expect(result).toContain("### Constraints (MUST RESPECT)");
      expect(result).not.toContain("**Security**:");
    });
  });

  describe("getRulesSection", () => {
    it("should return empty string when no rules exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = getRulesSection("/project");

      expect(result).toBe("");
    });

    it("should return formatted rules section when rules exist", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`
name: Test Project
description: Test description
customRules:
  - Follow best practices
`);

      const result = getRulesSection("/project");

      expect(result).toContain("# PROJECT RULES - YOU MUST FOLLOW THESE");
      expect(result).toContain("## Project Rules: Test Project");
      expect(result).toContain("Test description");
      expect(result).toContain("1. Follow best practices");
      expect(result).toContain("**IMPORTANT**: All code you write MUST comply with these rules");
    });

    it("should use current working directory when no path provided", () => {
      mockExistsSync.mockReturnValue(false);

      getRulesSection();

      expect(mockExistsSync).toHaveBeenCalled();
    });
  });
});
