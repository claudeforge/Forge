/**
 * Project Rules configuration page
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout/Layout";
import {
  Shield,
  Code,
  Palette,
  Server,
  Package,
  FolderTree,
  BookOpen,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Plus,
  X,
  Trash2,
  Terminal,
} from "lucide-react";
import { cn } from "../lib/utils";
import { api } from "../lib/api";
import type { Project } from "../lib/api";
import type { ProjectRules, RuleTemplate, TechStackRules, CodeConventions, ProjectStructure, ProjectConstraints } from "@claudeforge/forge-shared";
import { TECH_STACK_OPTIONS, RULE_TEMPLATES } from "@claudeforge/forge-shared";

const API_HOST = import.meta.env.DEV ? "http://127.0.0.1:3344" : "";

// API functions for rules
const rulesApi = {
  getRules: async (projectId: string): Promise<ProjectRules | null> => {
    try {
      const res = await fetch(`${API_HOST}/api/projects/${projectId}/rules`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch rules");
      return res.json();
    } catch {
      return null;
    }
  },
  saveRules: async (projectId: string, rules: Partial<ProjectRules>): Promise<ProjectRules> => {
    const res = await fetch(`${API_HOST}/api/projects/${projectId}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rules),
    });
    if (!res.ok) throw new Error("Failed to save rules");
    return res.json();
  },
  deleteRules: async (projectId: string): Promise<void> => {
    const res = await fetch(`${API_HOST}/api/projects/${projectId}/rules`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete rules");
  },
  applyTemplate: async (projectId: string, templateId: string): Promise<ProjectRules> => {
    const res = await fetch(`${API_HOST}/api/projects/${projectId}/rules/from-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    if (!res.ok) throw new Error("Failed to apply template");
    return res.json();
  },
  getTemplates: async (): Promise<RuleTemplate[]> => {
    const res = await fetch(`${API_HOST}/api/rules/templates`);
    if (!res.ok) throw new Error("Failed to fetch templates");
    const data = await res.json();
    return data.templates || [];
  },
};

// Default rules
const defaultTechStack: TechStackRules = {
  language: { primary: "typescript", strict: true },
  runtime: { name: "node" },
  build: { packageManager: "pnpm" },
};

const defaultConventions: CodeConventions = {
  fileNaming: "kebab-case",
  functionStyle: "arrow",
  exportStyle: "named",
  formatting: {
    indentStyle: "spaces",
    indentSize: 2,
    quotes: "double",
    semicolons: true,
    trailingComma: "es5",
  },
  documentation: { style: "tsdoc", required: "public" },
};

const defaultStructure: ProjectStructure = {
  srcDir: "src",
  directories: {
    components: "components",
    utils: "utils",
    types: "types",
  },
};

export function Rules() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Form state
  const [techStack, setTechStack] = useState<TechStackRules>(defaultTechStack);
  const [conventions, setConventions] = useState<CodeConventions>(defaultConventions);
  const [structure, setStructure] = useState<ProjectStructure>(defaultStructure);
  const [constraints, setConstraints] = useState<ProjectConstraints | undefined>();
  const [customRules, setCustomRules] = useState<string[]>([]);
  const [newCustomRule, setNewCustomRule] = useState("");
  
  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    techStack: true,
    conventions: true,
    structure: false,
    constraints: false,
    custom: false,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects,
  });

  const { data: rules, isLoading: isLoadingRules } = useQuery({
    queryKey: ["rules", selectedProjectId],
    queryFn: () => selectedProjectId ? rulesApi.getRules(selectedProjectId) : null,
    enabled: !!selectedProjectId,
  });

  const { data: templates } = useQuery({
    queryKey: ["ruleTemplates"],
    queryFn: rulesApi.getTemplates,
  });

  useEffect(() => {
    if (rules) {
      setTechStack(rules.techStack || defaultTechStack);
      setConventions(rules.conventions || defaultConventions);
      setStructure(rules.structure || defaultStructure);
      setConstraints(rules.constraints);
      setCustomRules(rules.customRules || []);
      setHasChanges(false);
    } else if (selectedProjectId && !isLoadingRules) {
      setTechStack(defaultTechStack);
      setConventions(defaultConventions);
      setStructure(defaultStructure);
      setConstraints(undefined);
      setCustomRules([]);
      setHasChanges(false);
    }
  }, [rules, selectedProjectId, isLoadingRules]);

  const saveMutation = useMutation({
    mutationFn: (data: { projectId: string; rules: Partial<ProjectRules> }) => 
      rulesApi.saveRules(data.projectId, data.rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules", selectedProjectId] });
      setHasChanges(false);
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: (data: { projectId: string; templateId: string }) =>
      rulesApi.applyTemplate(data.projectId, data.templateId),
    onSuccess: (newRules) => {
      setTechStack(newRules.techStack);
      setConventions(newRules.conventions);
      setStructure(newRules.structure);
      setConstraints(newRules.constraints);
      setCustomRules(newRules.customRules || []);
      queryClient.invalidateQueries({ queryKey: ["rules", selectedProjectId] });
      setShowTemplates(false);
      setHasChanges(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => rulesApi.deleteRules(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules", selectedProjectId] });
      setTechStack(defaultTechStack);
      setConventions(defaultConventions);
      setStructure(defaultStructure);
      setConstraints(undefined);
      setCustomRules([]);
      setHasChanges(false);
    },
  });

  const handleSave = () => {
    if (!selectedProjectId) return;
    saveMutation.mutate({
      projectId: selectedProjectId,
      rules: { techStack, conventions, structure, constraints, customRules: customRules.length > 0 ? customRules : undefined },
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    if (!selectedProjectId) return;
    applyTemplateMutation.mutate({ projectId: selectedProjectId, templateId });
  };

  const handleReset = () => {
    if (!selectedProjectId) return;
    deleteMutation.mutate(selectedProjectId);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const markChanged = () => setHasChanges(true);

  const addCustomRule = () => {
    if (newCustomRule.trim() && !customRules.includes(newCustomRule.trim())) {
      setCustomRules([...customRules, newCustomRule.trim()]);
      setNewCustomRule("");
      markChanged();
    }
  };

  return (
    <Layout title="Project Rules">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="h-7 w-7 text-forge-500" />
              Project Rules
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Configure tech stack and coding conventions for Claude Code</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-sm text-amber-500 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />Unsaved
              </span>
            )}
            <button onClick={() => setShowTemplates(true)} className="px-4 py-2 bg-purple-500/20 text-purple-500 dark:text-purple-400 rounded-lg hover:bg-purple-500/30 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />Templates
            </button>
            <button onClick={handleReset} disabled={!rules || deleteMutation.isPending} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />Reset
            </button>
            <button onClick={handleSave} disabled={!hasChanges || !selectedProjectId || saveMutation.isPending}
              className={cn("px-4 py-2 rounded-lg font-medium flex items-center gap-2",
                hasChanges && selectedProjectId ? "bg-forge-500 text-white hover:bg-forge-600" : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed")}>
              <Save className="h-4 w-4" />{saveMutation.isPending ? "Saving..." : "Save Rules"}
            </button>
          </div>
        </div>

        {/* Project Selector */}
        <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Select Project</label>
          <select value={selectedProjectId || ""} onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white focus:border-forge-500 focus:outline-none">
            <option value="">Choose a project...</option>
            {projects?.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {selectedProjectId && rules && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1"><Check className="h-4 w-4" />Rules configured</p>
          )}
          {selectedProjectId && !rules && !isLoadingRules && (
            <p className="text-sm text-gray-500 mt-2">No rules yet. Select a template or configure manually.</p>
          )}
        </div>

        {selectedProjectId && (
          <div className="space-y-4">
            <CollapsibleSection title="Tech Stack" icon={<Code className="h-5 w-5" />}
              expanded={expandedSections.techStack ?? false} onToggle={() => toggleSection("techStack")}>
              <TechStackEditor techStack={techStack} onChange={(ts) => { setTechStack(ts); markChanged(); }} />
            </CollapsibleSection>

            <CollapsibleSection title="Code Conventions" icon={<BookOpen className="h-5 w-5" />}
              expanded={expandedSections.conventions ?? false} onToggle={() => toggleSection("conventions")}>
              <ConventionsEditor conventions={conventions} onChange={(c) => { setConventions(c); markChanged(); }} />
            </CollapsibleSection>

            <CollapsibleSection title="Project Structure" icon={<FolderTree className="h-5 w-5" />}
              expanded={expandedSections.structure ?? false} onToggle={() => toggleSection("structure")}>
              <StructureEditor structure={structure} onChange={(s) => { setStructure(s); markChanged(); }} />
            </CollapsibleSection>

            <CollapsibleSection title="Constraints" icon={<AlertTriangle className="h-5 w-5" />}
              expanded={expandedSections.constraints ?? false} onToggle={() => toggleSection("constraints")}>
              <ConstraintsEditor constraints={constraints} onChange={(c) => { setConstraints(c); markChanged(); }} />
            </CollapsibleSection>

            <CollapsibleSection title="Custom Rules" icon={<Layers className="h-5 w-5" />}
              expanded={expandedSections.custom ?? false} onToggle={() => toggleSection("custom")} badge={customRules.length > 0 ? customRules.length : undefined}>
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Add custom rules for Claude Code to follow.</p>
                <div className="flex gap-2">
                  <input type="text" value={newCustomRule} onChange={(e) => setNewCustomRule(e.target.value)} placeholder="e.g., Always use async/await"
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && addCustomRule()} />
                  <button onClick={addCustomRule} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"><Plus className="h-5 w-5" /></button>
                </div>
                {customRules.length > 0 && (
                  <div className="space-y-2">
                    {customRules.map((rule, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-800 border border-gray-600 rounded-lg px-4 py-2">
                        <span className="text-gray-300">{rule}</span>
                        <button onClick={() => { setCustomRules(customRules.filter((_, idx) => idx !== i)); markChanged(); }} className="text-gray-500 hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {showTemplates && (
          <TemplatesModal templates={templates || RULE_TEMPLATES} onSelect={handleApplyTemplate} onClose={() => setShowTemplates(false)} isApplying={applyTemplateMutation.isPending} />
        )}
      </div>
    </Layout>
  );
}

// Collapsible Section
function CollapsibleSection({ title, icon, expanded, onToggle, children, badge }: {
  title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void; children: React.ReactNode; badge?: number;
}) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-forge-500 dark:text-forge-400">{icon}</span>
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
          {badge !== undefined && <span className="px-2 py-0.5 bg-forge-500/20 text-forge-500 dark:text-forge-400 text-xs rounded-full">{badge}</span>}
        </div>
        {expanded ? <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />}
      </button>
      {expanded && <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">{children}</div>}
    </div>
  );
}

// Select Field
function SelectField({ label, value, onChange, options, className }: {
  label: string; value: string; onChange: (v: string) => void; options: readonly { value: string; label: string }[]; className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-forge-500 focus:outline-none">
        <option value="">None</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// Tech Stack Editor
function TechStackEditor({ techStack, onChange }: { techStack: TechStackRules; onChange: (t: TechStackRules) => void }) {
  // Safe access with defaults
  const lang = techStack?.language || { primary: "typescript", strict: true };
  const runtime = techStack?.runtime;
  const framework = techStack?.framework;
  const styling = techStack?.styling;
  const database = techStack?.database;
  const testing = techStack?.testing;
  const build = techStack?.build;
  const state = techStack?.state;
  const apiConfig = techStack?.api;

  const update = (key: keyof TechStackRules, value: unknown) => onChange({ ...techStack, [key]: value });
  const allFrameworks = [...TECH_STACK_OPTIONS.frontendFrameworks, ...TECH_STACK_OPTIONS.backendFrameworks];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
      <SelectField label="Language" value={lang.primary || "typescript"} onChange={(v) => update("language", { ...lang, primary: v })} options={TECH_STACK_OPTIONS.languages} />
      <SelectField label="Runtime" value={runtime?.name || ""} onChange={(v) => update("runtime", v ? { name: v } : undefined)} options={TECH_STACK_OPTIONS.runtimes} />
      <SelectField label="Framework" value={framework?.name || ""} onChange={(v) => update("framework", v ? { name: v } : undefined)} options={allFrameworks} />
      <SelectField label="Styling" value={styling?.approach || ""} onChange={(v) => update("styling", v ? { approach: v } : undefined)} options={TECH_STACK_OPTIONS.styling} />
      <SelectField label="Database" value={database?.type || ""} onChange={(v) => update("database", v ? { type: v, orm: database?.orm } : undefined)} options={TECH_STACK_OPTIONS.databases} />
      <SelectField label="ORM" value={database?.orm || ""} onChange={(v) => update("database", { type: database?.type || "", orm: v || undefined })} options={TECH_STACK_OPTIONS.orms} />
      <SelectField label="Testing" value={testing?.framework || ""} onChange={(v) => update("testing", v ? { framework: v } : undefined)} options={TECH_STACK_OPTIONS.testing} />
      <SelectField label="E2E" value={testing?.e2e || ""} onChange={(v) => update("testing", { ...testing, framework: testing?.framework || "", e2e: v || undefined })} options={TECH_STACK_OPTIONS.e2e} />
      <SelectField label="Package Manager" value={build?.packageManager || ""} onChange={(v) => update("build", { ...build, packageManager: v })} options={TECH_STACK_OPTIONS.packageManagers} />
      <SelectField label="State" value={state?.library || ""} onChange={(v) => update("state", { ...state, library: v || undefined })} options={TECH_STACK_OPTIONS.stateManagement} />
      <SelectField label="Server State" value={state?.serverState || ""} onChange={(v) => update("state", { ...state, serverState: v || undefined })} options={TECH_STACK_OPTIONS.serverState} />
      <SelectField label="API Style" value={apiConfig?.style || ""} onChange={(v) => update("api", v ? { style: v } : undefined)} options={TECH_STACK_OPTIONS.apiStyles} />
      <SelectField label="Validation" value={apiConfig?.validation || ""} onChange={(v) => update("api", { ...apiConfig, style: apiConfig?.style || "", validation: v || undefined })} options={TECH_STACK_OPTIONS.validation} />
    </div>
  );
}

// Conventions Editor
function ConventionsEditor({ conventions, onChange }: { conventions: CodeConventions; onChange: (c: CodeConventions) => void }) {
  // Safe access with defaults
  const conv = conventions || defaultConventions;
  const formatting = conv.formatting || defaultConventions.formatting;
  const documentation = conv.documentation || defaultConventions.documentation;

  const update = <K extends keyof CodeConventions>(key: K, value: CodeConventions[K]) => onChange({ ...conv, [key]: value });
  const updateFormatting = <K extends keyof CodeConventions["formatting"]>(key: K, value: CodeConventions["formatting"][K]) =>
    onChange({ ...conv, formatting: { ...formatting, [key]: value } });

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SelectField label="File Naming" value={conv.fileNaming || "kebab-case"} onChange={(v) => update("fileNaming", v as CodeConventions["fileNaming"])}
          options={[{ value: "kebab-case", label: "kebab-case" }, { value: "camelCase", label: "camelCase" }, { value: "PascalCase", label: "PascalCase" }, { value: "snake_case", label: "snake_case" }]} />
        <SelectField label="Function Style" value={conv.functionStyle || "arrow"} onChange={(v) => update("functionStyle", v as CodeConventions["functionStyle"])}
          options={[{ value: "arrow", label: "Arrow Functions" }, { value: "declaration", label: "Function Declarations" }, { value: "mixed", label: "Mixed" }]} />
        <SelectField label="Export Style" value={conv.exportStyle || "named"} onChange={(v) => update("exportStyle", v as CodeConventions["exportStyle"])}
          options={[{ value: "named", label: "Named Exports" }, { value: "default", label: "Default Exports" }, { value: "mixed", label: "Mixed" }]} />
        <SelectField label="Documentation" value={documentation.style || "tsdoc"} onChange={(v) => update("documentation", { ...documentation, style: v as CodeConventions["documentation"]["style"] })}
          options={[{ value: "tsdoc", label: "TSDoc" }, { value: "jsdoc", label: "JSDoc" }, { value: "docstring", label: "Docstring" }, { value: "none", label: "None" }]} />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Formatting</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SelectField label="Indent Style" value={formatting.indentStyle || "spaces"} onChange={(v) => updateFormatting("indentStyle", v as "tabs" | "spaces")}
            options={[{ value: "spaces", label: "Spaces" }, { value: "tabs", label: "Tabs" }]} />
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">Indent Size</label>
            <input type="number" value={formatting.indentSize ?? 2} onChange={(e) => updateFormatting("indentSize", Number(e.target.value))} min={1} max={8}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-forge-500 focus:outline-none" />
          </div>
          <SelectField label="Quotes" value={formatting.quotes || "double"} onChange={(v) => updateFormatting("quotes", v as "single" | "double")}
            options={[{ value: "double", label: "Double" }, { value: "single", label: "Single" }]} />
          <SelectField label="Trailing Comma" value={formatting.trailingComma || "es5"} onChange={(v) => updateFormatting("trailingComma", v as "none" | "es5" | "all")}
            options={[{ value: "none", label: "None" }, { value: "es5", label: "ES5" }, { value: "all", label: "All" }]} />
        </div>
        <div className="flex items-center gap-6 mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={formatting.semicolons ?? true} onChange={(e) => updateFormatting("semicolons", e.target.checked)}
              className="rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-forge-500 focus:ring-forge-500" />
            Semicolons
          </label>
        </div>
      </div>
    </div>
  );
}

// Structure Editor
function StructureEditor({ structure, onChange }: { structure: ProjectStructure; onChange: (s: ProjectStructure) => void }) {
  // Safe access with defaults
  const struct = structure || defaultStructure;
  const directories = struct.directories || {};

  const updateDir = (key: keyof NonNullable<ProjectStructure["directories"]>, value: string) =>
    onChange({ ...struct, directories: { ...directories, [key]: value || undefined } });

  return (
    <div className="space-y-4 pt-4">
      <div>
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5">Source Directory</label>
        <input type="text" value={struct.srcDir || "src"} onChange={(e) => onChange({ ...struct, srcDir: e.target.value })} placeholder="src"
          className="w-full max-w-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-forge-500 focus:outline-none font-mono" />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Directory Paths</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["components", "pages", "api", "utils", "types", "hooks", "stores", "tests"] as const).map((dir) => (
            <div key={dir}>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 capitalize">{dir}</label>
              <input type="text" value={directories[dir] || ""} onChange={(e) => updateDir(dir, e.target.value)} placeholder={dir}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-forge-500 focus:outline-none font-mono" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <input type="checkbox" checked={struct.featureBased || false} onChange={(e) => onChange({ ...struct, featureBased: e.target.checked })}
          className="rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-forge-500 focus:ring-forge-500" />
        <label className="text-sm text-gray-600 dark:text-gray-300">Feature-based structure</label>
      </div>
    </div>
  );
}

// Constraints Editor
function ConstraintsEditor({ constraints, onChange }: { constraints?: ProjectConstraints; onChange: (c: ProjectConstraints | undefined) => void }) {
  const c = constraints || {};
  const update = <K extends keyof ProjectConstraints>(key: K, value: ProjectConstraints[K]) => onChange({ ...c, [key]: value });

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />Forbidden
          </h4>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Libraries (comma-separated)</label>
              <input type="text" value={c.forbidden?.libraries?.join(", ") || ""}
                onChange={(e) => update("forbidden", { ...c.forbidden, libraries: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                placeholder="moment, lodash" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-forge-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Patterns (comma-separated)</label>
              <input type="text" value={c.forbidden?.patterns?.join(", ") || ""}
                onChange={(e) => update("forbidden", { ...c.forbidden, patterns: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                placeholder="any, eval" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:border-forge-500 focus:outline-none" />
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500 dark:text-green-400" />Security
          </h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={c.security?.noSecrets || false} onChange={(e) => update("security", { ...c.security, noSecrets: e.target.checked })}
                className="rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-forge-500 focus:ring-forge-500" />
              No hardcoded secrets
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={c.security?.sanitization || false} onChange={(e) => update("security", { ...c.security, sanitization: e.target.checked })}
                className="rounded bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-forge-500 focus:ring-forge-500" />
              Input sanitization required
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// Templates Modal
function TemplatesModal({ templates, onSelect, onClose, isApplying }: {
  templates: RuleTemplate[]; onSelect: (templateId: string) => void; onClose: () => void; isApplying: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = [...new Set(templates.map(t => t.category))];
  const filtered = selectedCategory ? templates.filter(t => t.category === selectedCategory) : templates;

  const categoryIcons: Record<string, React.ReactNode> = {
    frontend: <Palette className="h-4 w-4" />,
    backend: <Server className="h-4 w-4" />,
    fullstack: <Layers className="h-4 w-4" />,
    api: <Code className="h-4 w-4" />,
    mobile: <Package className="h-4 w-4" />,
    cli: <Terminal className="h-4 w-4" />,
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500 dark:text-purple-400" />Rule Templates</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose a preset configuration</p>
          </div>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          <button onClick={() => setSelectedCategory(null)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", selectedCategory === null ? "bg-forge-500/20 text-forge-500 dark:text-forge-400" : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white")}>All</button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5", selectedCategory === cat ? "bg-forge-500/20 text-forge-500 dark:text-forge-400" : "bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white")}>
              {categoryIcons[cat]}{cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((template) => (
              <div key={template.id} className="bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-forge-500/50 transition-colors">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  {template.name}
                  {template.official && <span className="px-1.5 py-0.5 bg-forge-500/20 text-forge-500 dark:text-forge-400 text-xs rounded">Official</span>}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {template.tags.slice(0, 5).map(tag => <span key={tag} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">{tag}</span>)}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                  <button onClick={() => onSelect(template.id)} disabled={isApplying} className="px-4 py-1.5 bg-forge-500 text-white text-sm rounded-lg hover:bg-forge-600 disabled:opacity-50">
                    {isApplying ? "Applying..." : "Apply"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
