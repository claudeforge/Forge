/**
 * Project Rules Loader
 *
 * Loads and formats project rules from .forge/rules.yaml
 * for inclusion in spec, plan, and task prompts.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ProjectRules } from "@claudeforge/forge-shared";

const RULES_FILE = ".forge/rules.yaml";

/**
 * Load project rules from .forge/rules.yaml
 */
export function loadProjectRules(projectPath: string = process.cwd()): ProjectRules | null {
  const rulesPath = join(projectPath, RULES_FILE);

  if (!existsSync(rulesPath)) {
    return null;
  }

  try {
    const content = readFileSync(rulesPath, "utf-8");
    return parseYaml(content) as ProjectRules;
  } catch (error) {
    console.error("[FORGE] Failed to load project rules:", error);
    return null;
  }
}

/**
 * Format project rules into a readable string for prompts
 */
export function formatRulesForPrompt(rules: ProjectRules): string {
  const sections: string[] = [];

  // Header
  sections.push(`## Project Rules: ${rules.name}`);
  if (rules.description) {
    sections.push(rules.description);
  }
  sections.push("");

  // Tech Stack
  if (rules.techStack) {
    sections.push("### Tech Stack (MUST USE)");
    const ts = rules.techStack;

    if (ts.language) {
      sections.push(`- **Language**: ${ts.language.primary}${ts.language.version ? ` ${ts.language.version}` : ""}${ts.language.strict ? " (strict mode)" : ""}`);
    }
    if (ts.runtime) {
      sections.push(`- **Runtime**: ${ts.runtime.name}${ts.runtime.version ? ` ${ts.runtime.version}` : ""}`);
    }
    if (ts.framework) {
      sections.push(`- **Framework**: ${ts.framework.name}${ts.framework.version ? ` ${ts.framework.version}` : ""}${ts.framework.variant ? ` (${ts.framework.variant})` : ""}`);
    }
    if (ts.styling) {
      sections.push(`- **Styling**: ${ts.styling.approach}${ts.styling.library ? ` with ${ts.styling.library}` : ""}`);
    }
    if (ts.database) {
      sections.push(`- **Database**: ${ts.database.type}${ts.database.orm ? ` with ${ts.database.orm}` : ""}`);
    }
    if (ts.api) {
      sections.push(`- **API Style**: ${ts.api.style}${ts.api.validation ? ` with ${ts.api.validation} validation` : ""}`);
    }
    if (ts.testing) {
      sections.push(`- **Testing**: ${ts.testing.framework}${ts.testing.e2e ? `, E2E: ${ts.testing.e2e}` : ""}${ts.testing.coverage ? ` (${ts.testing.coverage}% coverage required)` : ""}`);
    }
    if (ts.build?.packageManager) {
      sections.push(`- **Package Manager**: ${ts.build.packageManager}`);
    }
    if (ts.state) {
      const stateLibs = [ts.state.library, ts.state.serverState].filter(Boolean).join(", ");
      if (stateLibs) sections.push(`- **State Management**: ${stateLibs}`);
    }
    sections.push("");
  }

  // Code Conventions
  if (rules.conventions) {
    sections.push("### Code Conventions (MUST FOLLOW)");
    const conv = rules.conventions;

    sections.push(`- **File Naming**: ${conv.fileNaming}`);
    if (conv.componentNaming) {
      sections.push(`- **Component Naming**: ${conv.componentNaming}`);
    }
    sections.push(`- **Function Style**: ${conv.functionStyle} functions`);
    sections.push(`- **Export Style**: ${conv.exportStyle} exports`);

    if (conv.formatting) {
      const fmt = conv.formatting;
      sections.push(`- **Formatting**: ${fmt.indentSize} ${fmt.indentStyle}, ${fmt.quotes} quotes, ${fmt.semicolons ? "with" : "no"} semicolons, ${fmt.trailingComma} trailing commas`);
    }

    if (conv.documentation) {
      sections.push(`- **Documentation**: ${conv.documentation.style} style, ${conv.documentation.required} functions`);
    }

    if (conv.errorHandling) {
      sections.push(`- **Error Handling**: ${conv.errorHandling.style}`);
    }
    sections.push("");
  }

  // Project Structure
  if (rules.structure) {
    sections.push("### Project Structure");
    const struct = rules.structure;

    sections.push(`- **Source Directory**: ${struct.srcDir}/`);
    if (struct.directories) {
      const dirs = struct.directories;
      const dirList = Object.entries(dirs)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}/`)
        .join(", ");
      if (dirList) sections.push(`- **Directories**: ${dirList}`);
    }
    if (struct.featureBased) {
      sections.push("- **Structure**: Feature-based organization");
    }
    if (struct.monorepo) {
      sections.push(`- **Monorepo**: ${struct.monorepo.tool} (packages in ${struct.monorepo.packages})`);
    }
    sections.push("");
  }

  // Constraints
  if (rules.constraints) {
    sections.push("### Constraints (MUST RESPECT)");
    const c = rules.constraints;

    if (c.forbidden?.libraries?.length) {
      sections.push(`- **Forbidden Libraries**: ${c.forbidden.libraries.join(", ")}`);
    }
    if (c.forbidden?.patterns?.length) {
      sections.push(`- **Forbidden Patterns**: ${c.forbidden.patterns.join(", ")}`);
    }
    if (c.forbidden?.practices?.length) {
      sections.push(`- **Forbidden Practices**: ${c.forbidden.practices.join(", ")}`);
    }
    if (c.required?.patterns?.length) {
      sections.push(`- **Required Patterns**: ${c.required.patterns.join(", ")}`);
    }
    if (c.required?.practices?.length) {
      sections.push(`- **Required Practices**: ${c.required.practices.join(", ")}`);
    }
    if (c.security) {
      const secRules = [];
      if (c.security.noSecrets) secRules.push("no hardcoded secrets");
      if (c.security.sanitization) secRules.push("input sanitization required");
      if (c.security.csp) secRules.push("CSP headers required");
      if (secRules.length) sections.push(`- **Security**: ${secRules.join(", ")}`);
    }
    if (c.accessibility?.required) {
      sections.push(`- **Accessibility**: WCAG ${c.accessibility.level || "AA"} compliance required`);
    }
    sections.push("");
  }

  // Custom Rules
  if (rules.customRules?.length) {
    sections.push("### Custom Rules (MUST FOLLOW)");
    rules.customRules.forEach((rule, i) => {
      sections.push(`${i + 1}. ${rule}`);
    });
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Get rules section for inclusion in prompts
 * Returns empty string if no rules defined
 */
export function getRulesSection(projectPath: string = process.cwd()): string {
  const rules = loadProjectRules(projectPath);
  if (!rules) return "";

  return `
---

# PROJECT RULES - YOU MUST FOLLOW THESE

${formatRulesForPrompt(rules)}

**IMPORTANT**: All code you write MUST comply with these rules. Do not deviate from the specified tech stack, conventions, or constraints.

---
`;
}
