/**
 * Project Rules - Tech Stack & Conventions
 * 
 * Rules that Claude Code must follow when working on a project.
 * These are set via WebUI and respected by the plugin.
 */

// ============================================
// TECH STACK CATEGORIES
// ============================================

export interface TechStackRules {
  language: {
    primary: string;
    version?: string;
    strict?: boolean;
  };

  runtime?: {
    name: string;
    version?: string;
  };

  framework?: {
    name: string;
    version?: string;
    variant?: string;
  };

  styling?: {
    approach: string;
    library?: string;
  };

  database?: {
    type: string;
    orm?: string;
  };

  api?: {
    style: string;
    validation?: string;
  };

  testing?: {
    framework: string;
    e2e?: string;
    coverage?: number;
  };

  build?: {
    bundler?: string;
    packageManager: string;
  };

  state?: {
    library?: string;
    serverState?: string;
  };

  auth?: {
    provider?: string;
    strategy?: string[];
  };
}

// ============================================
// CODE CONVENTIONS
// ============================================

export interface CodeConventions {
  fileNaming: "kebab-case" | "camelCase" | "PascalCase" | "snake_case";
  componentNaming?: "PascalCase" | "kebab-case";
  functionStyle: "arrow" | "declaration" | "mixed";
  exportStyle: "named" | "default" | "mixed";
  importOrder?: string[];

  formatting: {
    indentStyle: "tabs" | "spaces";
    indentSize: number;
    lineWidth?: number;
    quotes: "single" | "double";
    semicolons: boolean;
    trailingComma: "none" | "es5" | "all";
  };

  documentation: {
    style: "jsdoc" | "tsdoc" | "docstring" | "none";
    required: "public" | "all" | "none";
  };

  errorHandling?: {
    style: "try-catch" | "result-type" | "either" | "exceptions";
    customErrorClasses?: boolean;
  };
}

// ============================================
// PROJECT STRUCTURE
// ============================================

export interface ProjectStructure {
  srcDir: string;

  directories: {
    components?: string;
    pages?: string;
    api?: string;
    utils?: string;
    types?: string;
    hooks?: string;
    stores?: string;
    tests?: string;
  };

  monorepo?: {
    tool: "turborepo" | "nx" | "lerna" | "pnpm-workspaces";
    packages: string;
  };

  featureBased?: boolean;
}

// ============================================
// CONSTRAINTS & RESTRICTIONS
// ============================================

export interface ProjectConstraints {
  forbidden?: {
    libraries?: string[];
    patterns?: string[];
    practices?: string[];
  };

  required?: {
    patterns?: string[];
    practices?: string[];
  };

  performance?: {
    maxBundleSize?: string;
    lazyLoading?: boolean;
    imageOptimization?: boolean;
  };

  security?: {
    csp?: boolean;
    sanitization?: boolean;
    noSecrets?: boolean;
  };

  accessibility?: {
    level?: "A" | "AA" | "AAA";
    required?: boolean;
  };
}

// ============================================
// MAIN PROJECT RULES TYPE
// ============================================

export interface ProjectRules {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;

  techStack: TechStackRules;
  conventions: CodeConventions;
  structure: ProjectStructure;
  constraints?: ProjectConstraints;

  customRules?: string[];
  templateId?: string;
}

// ============================================
// RULE TEMPLATES
// ============================================

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: "frontend" | "backend" | "fullstack" | "mobile" | "api" | "cli";
  tags: string[];
  rules: Omit<ProjectRules, "id" | "name" | "createdAt" | "updatedAt">;
  popularity?: number;
  official?: boolean;
}

// ============================================
// PRESET TECH STACK OPTIONS
// ============================================

export const TECH_STACK_OPTIONS = {
  languages: [
    { value: "typescript", label: "TypeScript" },
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "java", label: "Java" },
    { value: "csharp", label: "C#" },
  ],

  runtimes: [
    { value: "node", label: "Node.js" },
    { value: "bun", label: "Bun" },
    { value: "deno", label: "Deno" },
    { value: "browser", label: "Browser" },
  ],

  frontendFrameworks: [
    { value: "react", label: "React" },
    { value: "next", label: "Next.js" },
    { value: "vue", label: "Vue" },
    { value: "nuxt", label: "Nuxt" },
    { value: "svelte", label: "Svelte" },
    { value: "sveltekit", label: "SvelteKit" },
    { value: "solid", label: "Solid" },
    { value: "astro", label: "Astro" },
    { value: "remix", label: "Remix" },
  ],

  backendFrameworks: [
    { value: "express", label: "Express" },
    { value: "fastify", label: "Fastify" },
    { value: "hono", label: "Hono" },
    { value: "nestjs", label: "NestJS" },
    { value: "fastapi", label: "FastAPI" },
    { value: "django", label: "Django" },
    { value: "flask", label: "Flask" },
    { value: "gin", label: "Gin (Go)" },
    { value: "actix", label: "Actix (Rust)" },
  ],

  databases: [
    { value: "postgresql", label: "PostgreSQL" },
    { value: "mysql", label: "MySQL" },
    { value: "sqlite", label: "SQLite" },
    { value: "mongodb", label: "MongoDB" },
    { value: "redis", label: "Redis" },
    { value: "supabase", label: "Supabase" },
    { value: "planetscale", label: "PlanetScale" },
    { value: "turso", label: "Turso" },
  ],

  orms: [
    { value: "prisma", label: "Prisma" },
    { value: "drizzle", label: "Drizzle" },
    { value: "typeorm", label: "TypeORM" },
    { value: "sequelize", label: "Sequelize" },
    { value: "mongoose", label: "Mongoose" },
    { value: "sqlalchemy", label: "SQLAlchemy" },
  ],

  styling: [
    { value: "tailwind", label: "Tailwind CSS" },
    { value: "css-modules", label: "CSS Modules" },
    { value: "styled-components", label: "Styled Components" },
    { value: "emotion", label: "Emotion" },
    { value: "scss", label: "SCSS/Sass" },
    { value: "vanilla", label: "Vanilla CSS" },
  ],

  uiLibraries: [
    { value: "shadcn", label: "shadcn/ui" },
    { value: "radix", label: "Radix UI" },
    { value: "mui", label: "Material UI" },
    { value: "chakra", label: "Chakra UI" },
    { value: "antd", label: "Ant Design" },
    { value: "mantine", label: "Mantine" },
  ],

  testing: [
    { value: "vitest", label: "Vitest" },
    { value: "jest", label: "Jest" },
    { value: "pytest", label: "pytest" },
    { value: "mocha", label: "Mocha" },
  ],

  e2e: [
    { value: "playwright", label: "Playwright" },
    { value: "cypress", label: "Cypress" },
    { value: "puppeteer", label: "Puppeteer" },
  ],

  packageManagers: [
    { value: "npm", label: "npm" },
    { value: "yarn", label: "Yarn" },
    { value: "pnpm", label: "pnpm" },
    { value: "bun", label: "Bun" },
  ],

  stateManagement: [
    { value: "zustand", label: "Zustand" },
    { value: "jotai", label: "Jotai" },
    { value: "redux", label: "Redux Toolkit" },
    { value: "mobx", label: "MobX" },
    { value: "recoil", label: "Recoil" },
    { value: "pinia", label: "Pinia (Vue)" },
  ],

  serverState: [
    { value: "tanstack-query", label: "TanStack Query" },
    { value: "swr", label: "SWR" },
    { value: "rtk-query", label: "RTK Query" },
    { value: "apollo", label: "Apollo Client" },
  ],

  apiStyles: [
    { value: "rest", label: "REST" },
    { value: "graphql", label: "GraphQL" },
    { value: "trpc", label: "tRPC" },
    { value: "grpc", label: "gRPC" },
  ],

  validation: [
    { value: "zod", label: "Zod" },
    { value: "yup", label: "Yup" },
    { value: "joi", label: "Joi" },
    { value: "valibot", label: "Valibot" },
  ],
} as const;

export type TechStackOptionKey = keyof typeof TECH_STACK_OPTIONS;
