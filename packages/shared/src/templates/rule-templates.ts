/**
 * Default Rule Templates
 */

import type { RuleTemplate } from "../types/rules.js";

export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: "react-19-vite-tailwind4-shadcn",
    name: "React 19 + Vite + Tailwind 4 + shadcn/ui",
    description: "Modern React 19 SPA with Vite, Tailwind CSS 4, shadcn/ui components, and Lucide icons",
    category: "frontend",
    tags: ["react", "react-19", "vite", "tailwind", "tailwind-4", "shadcn", "lucide", "typescript"],
    official: true,
    popularity: 100,
    rules: {
      version: "1.0",
      techStack: {
        language: { primary: "typescript", strict: true },
        runtime: { name: "browser" },
        framework: { name: "react", version: "19" },
        styling: { approach: "tailwind", library: "shadcn" },
        build: { bundler: "vite", packageManager: "pnpm" },
        state: { library: "zustand", serverState: "tanstack-query" },
        api: { style: "rest", validation: "zod" },
        testing: { framework: "vitest", e2e: "playwright" },
      },
      conventions: {
        fileNaming: "kebab-case",
        componentNaming: "PascalCase",
        functionStyle: "arrow",
        exportStyle: "named",
        importOrder: ["react", "@/components", "@/lib", "@/hooks", "./"],
        formatting: { indentStyle: "spaces", indentSize: 2, quotes: "double", semicolons: true, trailingComma: "es5" },
        documentation: { style: "tsdoc", required: "public" },
      },
      structure: {
        srcDir: "src",
        directories: { components: "components", pages: "pages", utils: "lib", types: "types", hooks: "hooks", stores: "stores" },
      },
      constraints: {
        forbidden: { libraries: ["moment", "lodash", "jquery"], patterns: ["any", "as any"] },
        security: { noSecrets: true, sanitization: true },
        accessibility: { level: "AA", required: true },
      },
      customRules: [
        "Use Lucide React for all icons (import from lucide-react)",
        "Use shadcn/ui components from @/components/ui",
        "Use Tailwind CSS 4 with CSS variables for theming",
        "Prefer cn() utility from @/lib/utils for className merging",
        "Use TanStack Query for server state management",
        "Use Zustand for client state management",
      ],
    },
  },
  {
    id: "next-15-react-19",
    name: "Next.js 15 + React 19",
    description: "Latest Next.js 15 with React 19, App Router, Tailwind 4, and shadcn/ui",
    category: "fullstack",
    tags: ["react", "react-19", "next", "next-15", "typescript", "tailwind", "shadcn", "app-router"],
    official: true,
    popularity: 95,
    rules: {
      version: "1.0",
      techStack: {
        language: { primary: "typescript", strict: true },
        runtime: { name: "node", version: "20" },
        framework: { name: "next", version: "15", variant: "app-router" },
        styling: { approach: "tailwind", library: "shadcn" },
        build: { packageManager: "pnpm" },
        state: { serverState: "tanstack-query" },
        api: { style: "rest", validation: "zod" },
        testing: { framework: "vitest", e2e: "playwright" },
      },
      conventions: {
        fileNaming: "kebab-case",
        componentNaming: "PascalCase",
        functionStyle: "arrow",
        exportStyle: "named",
        importOrder: ["react", "next", "@/", "./"],
        formatting: { indentStyle: "spaces", indentSize: 2, quotes: "double", semicolons: true, trailingComma: "es5" },
        documentation: { style: "tsdoc", required: "public" },
      },
      structure: {
        srcDir: "src",
        directories: { components: "components", pages: "app", api: "app/api", utils: "lib", types: "types", hooks: "hooks" },
      },
      constraints: {
        forbidden: { libraries: ["moment", "lodash"], patterns: ["any"] },
        security: { noSecrets: true, sanitization: true },
        accessibility: { level: "AA", required: true },
      },
      customRules: [
        "Use React 19 features: use() hook, Actions, useOptimistic",
        "Prefer Server Components by default",
        "Use Lucide React for icons",
        "Use shadcn/ui for UI components",
      ],
    },
  },
  {
    id: "next-14-typescript-tailwind",
    name: "Next.js 14 + TypeScript + Tailwind",
    description: "Full-stack React with App Router, TypeScript, and Tailwind CSS",
    category: "fullstack",
    tags: ["react", "next", "typescript", "tailwind", "app-router"],
    official: true,
    rules: {
      version: "1.0",
      techStack: {
        language: { primary: "typescript", strict: true },
        runtime: { name: "node", version: "20" },
        framework: { name: "next", version: "14", variant: "app-router" },
        styling: { approach: "tailwind", library: "shadcn" },
        build: { packageManager: "pnpm" },
        state: { serverState: "tanstack-query" },
        api: { style: "rest", validation: "zod" },
        testing: { framework: "vitest", e2e: "playwright" },
      },
      conventions: {
        fileNaming: "kebab-case",
        componentNaming: "PascalCase",
        functionStyle: "arrow",
        exportStyle: "named",
        importOrder: ["react", "next", "@/", "./"],
        formatting: { indentStyle: "spaces", indentSize: 2, quotes: "double", semicolons: true, trailingComma: "es5" },
        documentation: { style: "tsdoc", required: "public" },
      },
      structure: {
        srcDir: "src",
        directories: { components: "components", pages: "app", api: "app/api", utils: "lib", types: "types", hooks: "hooks" },
      },
      constraints: {
        forbidden: { libraries: ["moment", "lodash"], patterns: ["any"] },
        security: { noSecrets: true, sanitization: true },
        accessibility: { level: "AA", required: true },
      },
    },
  },
  {
    id: "react-vite-typescript",
    name: "React 18 + Vite + TypeScript",
    description: "React SPA with Vite and TypeScript",
    category: "frontend",
    tags: ["react", "vite", "typescript", "spa"],
    official: true,
    rules: {
      version: "1.0",
      techStack: {
        language: { primary: "typescript", strict: true },
        runtime: { name: "browser" },
        framework: { name: "react", version: "18" },
        styling: { approach: "tailwind" },
        build: { bundler: "vite", packageManager: "pnpm" },
        state: { library: "zustand", serverState: "tanstack-query" },
        testing: { framework: "vitest", e2e: "playwright" },
      },
      conventions: {
        fileNaming: "kebab-case",
        componentNaming: "PascalCase",
        functionStyle: "arrow",
        exportStyle: "named",
        formatting: { indentStyle: "spaces", indentSize: 2, quotes: "double", semicolons: true, trailingComma: "es5" },
        documentation: { style: "jsdoc", required: "public" },
      },
      structure: {
        srcDir: "src",
        directories: { components: "components", pages: "pages", utils: "utils", types: "types", hooks: "hooks", stores: "stores" },
      },
    },
  },
  {
    id: "hono-node-drizzle",
    name: "Hono + Node + Drizzle",
    description: "Modern Node.js API with Hono, Drizzle ORM, and SQLite",
    category: "api",
    tags: ["hono", "node", "typescript", "api", "drizzle", "sqlite"],
    official: true,
    rules: {
      version: "1.0",
      techStack: {
        language: { primary: "typescript", strict: true },
        runtime: { name: "node", version: "20" },
        framework: { name: "hono" },
        database: { type: "sqlite", orm: "drizzle" },
        api: { style: "rest", validation: "zod" },
        build: { packageManager: "pnpm" },
        testing: { framework: "vitest" },
      },
      conventions: {
        fileNaming: "kebab-case",
        functionStyle: "arrow",
        exportStyle: "named",
        formatting: { indentStyle: "spaces", indentSize: 2, quotes: "double", semicolons: true, trailingComma: "es5" },
        documentation: { style: "tsdoc", required: "public" },
      },
      structure: { srcDir: "src", directories: { api: "routes", utils: "lib", types: "types" } },
      customRules: [
        "Use Drizzle ORM for database operations",
        "Use Zod for request/response validation",
        "Use Hono middleware for auth and error handling",
      ],
    },
  },
  {
    id: "hono-bun-api",
    name: "Hono + Bun API",
    description: "Ultra-fast API with Hono framework and Bun runtime",
    category: "api",
    tags: ["hono", "bun", "typescript", "api", "edge"],
    official: true,
    rules: {
      version: "1.0",
      techStack: {
        language: { primary: "typescript", strict: true },
        runtime: { name: "bun" },
        framework: { name: "hono" },
        database: { type: "sqlite", orm: "drizzle" },
        api: { style: "rest", validation: "zod" },
        build: { packageManager: "bun" },
        testing: { framework: "vitest" },
      },
      conventions: {
        fileNaming: "kebab-case",
        functionStyle: "arrow",
        exportStyle: "named",
        formatting: { indentStyle: "spaces", indentSize: 2, quotes: "double", semicolons: true, trailingComma: "all" },
        documentation: { style: "tsdoc", required: "public" },
      },
      structure: { srcDir: "src", directories: { api: "routes", utils: "lib", types: "types" } },
    },
  },
  {
    id: "express-typescript-api",
    name: "Express + TypeScript API",
    description: "REST API backend with Express, TypeScript, and Prisma",
    category: "backend",
    tags: ["express", "typescript", "api", "prisma", "rest"],
    official: true,
    rules: {
      version: "1.0",
      techStack: {
        language: { primary: "typescript", strict: true },
        runtime: { name: "node", version: "20" },
        framework: { name: "express" },
        database: { type: "postgresql", orm: "prisma" },
        api: { style: "rest", validation: "zod" },
        build: { packageManager: "pnpm" },
        testing: { framework: "vitest", coverage: 80 },
      },
      conventions: {
        fileNaming: "kebab-case",
        functionStyle: "arrow",
        exportStyle: "named",
        formatting: { indentStyle: "spaces", indentSize: 2, quotes: "double", semicolons: true, trailingComma: "es5" },
        documentation: { style: "tsdoc", required: "public" },
        errorHandling: { style: "try-catch", customErrorClasses: true },
      },
      structure: {
        srcDir: "src",
        directories: { api: "routes", utils: "utils", types: "types", tests: "__tests__" },
      },
      constraints: { security: { noSecrets: true, sanitization: true } },
    },
  },
  {
    id: "python-fastapi",
    name: "FastAPI + Python",
    description: "Modern Python API with FastAPI, async, and Pydantic",
    category: "api",
    tags: ["python", "fastapi", "api", "async", "pydantic"],
    official: true,
    rules: {
      version: "1.0",
      techStack: {
        language: { primary: "python", version: "3.12" },
        framework: { name: "fastapi" },
        database: { type: "postgresql", orm: "sqlalchemy" },
        api: { style: "rest", validation: "pydantic" },
        testing: { framework: "pytest", coverage: 80 },
      },
      conventions: {
        fileNaming: "snake_case",
        functionStyle: "declaration",
        exportStyle: "named",
        formatting: { indentStyle: "spaces", indentSize: 4, quotes: "double", semicolons: false, trailingComma: "all" },
        documentation: { style: "docstring", required: "public" },
      },
      structure: { srcDir: "app", directories: { api: "routes", utils: "utils", types: "models", tests: "tests" } },
    },
  },
  {
    id: "electron-react-vite",
    name: "Electron + React + Vite",
    description: "Desktop app with Electron, React 19, and Vite",
    category: "frontend",
    tags: ["electron", "react", "vite", "desktop", "typescript"],
    official: true,
    rules: {
      version: "1.0",
      techStack: {
        language: { primary: "typescript", strict: true },
        runtime: { name: "node", version: "20" },
        framework: { name: "react", version: "19" },
        styling: { approach: "tailwind", library: "shadcn" },
        build: { bundler: "vite", packageManager: "pnpm" },
        state: { library: "zustand" },
        testing: { framework: "vitest", e2e: "playwright" },
      },
      conventions: {
        fileNaming: "kebab-case",
        componentNaming: "PascalCase",
        functionStyle: "arrow",
        exportStyle: "named",
        formatting: { indentStyle: "spaces", indentSize: 2, quotes: "double", semicolons: true, trailingComma: "es5" },
        documentation: { style: "tsdoc", required: "public" },
      },
      structure: {
        srcDir: "src",
        directories: { components: "renderer/components", pages: "renderer/pages", utils: "renderer/lib", types: "shared/types" },
      },
      customRules: [
        "Separate main and renderer process code",
        "Use IPC for main-renderer communication",
        "Use Lucide React for icons",
      ],
    },
  },
];

export function getTemplateById(id: string): RuleTemplate | undefined {
  return RULE_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: RuleTemplate["category"]): RuleTemplate[] {
  return RULE_TEMPLATES.filter(t => t.category === category);
}

export function getTemplatesByTag(tag: string): RuleTemplate[] {
  return RULE_TEMPLATES.filter(t => t.tags.includes(tag));
}
