/**
 * Project Rules API Routes
 * 
 * Manages project rules stored in .forge/rules.yaml
 */

import { Hono } from "hono";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { db } from "../db/index.js";
import { projects } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { broadcast } from "../broadcast.js";
import { RULE_TEMPLATES, getTemplateById } from "@claudeforge/forge-shared";
import type { ProjectRules } from "@claudeforge/forge-shared";

const app = new Hono();

function getProjectPath(projectId: string): string | null {
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  return project?.path ?? null;
}

function getRulesPath(projectPath: string): string {
  return join(projectPath, ".forge", "rules.yaml");
}

function loadRules(projectPath: string): ProjectRules | null {
  const rulesPath = getRulesPath(projectPath);
  if (!existsSync(rulesPath)) return null;
  try {
    const content = readFileSync(rulesPath, "utf-8");
    return parseYaml(content) as ProjectRules;
  } catch {
    return null;
  }
}

function saveRules(projectPath: string, rules: ProjectRules): void {
  const rulesPath = getRulesPath(projectPath);
  const dir = dirname(rulesPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(rulesPath, stringifyYaml(rules, { lineWidth: 120 }));
}

function generateId(): string {
  return "rules-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// GET /api/projects/:projectId/rules
app.get("/projects/:projectId/rules", (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) return c.json({ error: "Project not found" }, 404);
  const rules = loadRules(projectPath);
  return c.json({ rules, hasRules: !!rules });
});

// POST /api/projects/:projectId/rules
app.post("/projects/:projectId/rules", async (c) => {
  const projectId = c.req.param("projectId");
  const projectPath = getProjectPath(projectId);
  if (!projectPath) return c.json({ error: "Project not found" }, 404);

  const body = await c.req.json();
  const now = new Date().toISOString();
  const existing = loadRules(projectPath);

  const rules: ProjectRules = {
    id: existing?.id || generateId(),
    name: body.name || existing?.name || "Project Rules",
    description: body.description,
    version: "1.0",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    techStack: body.techStack || existing?.techStack,
    conventions: body.conventions || existing?.conventions,
    structure: body.structure || existing?.structure,
    constraints: body.constraints || existing?.constraints,
    customRules: body.customRules || existing?.customRules,
    templateId: body.templateId || existing?.templateId,
  };

  saveRules(projectPath, rules);
  broadcast({ type: "rules:update", projectId, rules });
  return c.json({ rules });
});

// POST /api/projects/:projectId/rules/from-template
app.post("/projects/:projectId/rules/from-template", async (c) => {
  const projectId = c.req.param("projectId");
  const projectPath = getProjectPath(projectId);
  if (!projectPath) return c.json({ error: "Project not found" }, 404);

  const { templateId, customName } = await c.req.json();
  if (!templateId) return c.json({ error: "templateId is required" }, 400);

  const template = getTemplateById(templateId);
  if (!template) return c.json({ error: "Template not found" }, 404);

  const now = new Date().toISOString();
  const rules: ProjectRules = {
    id: generateId(),
    name: customName || template.name,
    description: template.description,
    version: template.rules.version,
    createdAt: now,
    updatedAt: now,
    techStack: template.rules.techStack,
    conventions: template.rules.conventions,
    structure: template.rules.structure,
    constraints: template.rules.constraints,
    customRules: template.rules.customRules,
    templateId: template.id,
  };

  saveRules(projectPath, rules);
  broadcast({ type: "rules:update", projectId, rules });
  return c.json({ rules, template });
});

// DELETE /api/projects/:projectId/rules
app.delete("/projects/:projectId/rules", (c) => {
  const projectId = c.req.param("projectId");
  const projectPath = getProjectPath(projectId);
  if (!projectPath) return c.json({ error: "Project not found" }, 404);

  const rulesPath = getRulesPath(projectPath);
  if (existsSync(rulesPath)) unlinkSync(rulesPath);

  broadcast({ type: "rules:update", projectId, rules: null });
  return c.json({ deleted: true });
});

// GET /api/rules/templates
app.get("/rules/templates", (c) => {
  return c.json({ templates: RULE_TEMPLATES });
});

// GET /api/rules/templates/:templateId
app.get("/rules/templates/:templateId", (c) => {
  const template = getTemplateById(c.req.param("templateId"));
  if (!template) return c.json({ error: "Template not found" }, 404);
  return c.json({ template });
});

export default app;
