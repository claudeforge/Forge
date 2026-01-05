/**
 * Edit Task Modal
 */

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Zap } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Task } from "../../lib/api";
import { cn } from "../../lib/utils";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

interface Criterion {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
}

const CRITERION_PRESETS = [
  { label: "Tests Pass", type: "test-pass", name: "Tests Pass", config: { cmd: "npm test" } },
  { label: "Lint Clean", type: "lint-clean", name: "Lint Clean", config: { cmd: "npm run lint" } },
  { label: "Build", type: "command", name: "Build", config: { cmd: "npm run build" } },
  { label: "TypeCheck", type: "command", name: "TypeCheck", config: { cmd: "npm run typecheck" } },
];

const CRITERIA_TEMPLATES = [
  { label: "Full CI", criteria: ["Tests Pass", "Lint Clean", "Build", "TypeCheck"] },
  { label: "Tests Only", criteria: ["Tests Pass"] },
  { label: "Quality Check", criteria: ["Lint Clean", "TypeCheck"] },
  { label: "Build Ready", criteria: ["Tests Pass", "Build"] },
];

export function EditTaskModal({ isOpen, onClose, task }: EditTaskModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [maxIterations, setMaxIterations] = useState(30);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [customCmd, setCustomCmd] = useState("");

  // Parse task config when task changes
  useEffect(() => {
    if (task) {
      setName(task.name);
      setPrompt(task.prompt);
      try {
        const config = typeof task.config === "string" ? JSON.parse(task.config) : task.config;
        setMaxIterations(config?.maxIterations ?? 30);
        setCriteria(config?.criteria ?? []);
      } catch {
        setMaxIterations(30);
        setCriteria([]);
      }
    }
  }, [task]);

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateTask>[1] }) =>
      api.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      onClose();
    },
  });

  const addCriterion = (p: typeof CRITERION_PRESETS[number]) => {
    if (criteria.some(c => c.name === p.name)) return;
    setCriteria([...criteria, { id: "c" + Date.now(), type: p.type, name: p.name, config: p.config }]);
  };

  const addCustom = () => {
    if (!customCmd.trim()) return;
    setCriteria([...criteria, { id: "c" + Date.now(), type: "command", name: customCmd, config: { cmd: customCmd } }]);
    setCustomCmd("");
  };

  const applyTemplate = (template: typeof CRITERIA_TEMPLATES[number]) => {
    const newCriteria = template.criteria
      .map(name => CRITERION_PRESETS.find(p => p.name === name))
      .filter(Boolean)
      .map((p, i) => ({ id: "c" + Date.now() + i, type: p!.type, name: p!.name, config: p!.config }));
    setCriteria(newCriteria);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !name || !prompt) return;
    updateTask.mutate({
      id: task.id,
      data: {
        name,
        prompt,
        config: { criteria, maxIterations },
      },
    });
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Edit Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Task Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Add auth" className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-forge-500 focus:outline-none" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the task..." rows={4} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 resize-none focus:border-forge-500 focus:outline-none" required />
          </div>

          {/* Max Iterations - Prominent */}
          <div className="bg-forge-500/10 border border-forge-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="h-5 w-5 text-forge-400" />
              <label className="text-sm font-medium text-forge-300">Max Iterations</label>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                min={1}
                max={100}
                className="flex-1 accent-forge-500"
              />
              <input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value) || 30)}
                min={1}
                max={100}
                className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-center focus:border-forge-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Number of times Claude will iterate until success criteria are met</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Success Criteria</label>

            {/* Templates */}
            <div className="mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Templates</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {CRITERIA_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Criteria */}
            <div className="flex flex-wrap gap-2 mb-3">
              {CRITERION_PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => addCriterion(p)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", criteria.some(c => c.name === p.name) ? "bg-forge-500/20 text-forge-400 border border-forge-500/50" : "bg-gray-700 text-gray-300 hover:bg-gray-600")}>{p.label}</button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <input type="text" value={customCmd} onChange={(e) => setCustomCmd(e.target.value)} placeholder="Custom command" className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-forge-500 focus:outline-none" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())} />
              <button type="button" onClick={addCustom} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"><Plus className="h-5 w-5" /></button>
            </div>
            {criteria.length > 0 ? (
              <div className="space-y-2">
                {criteria.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-gray-800 border border-gray-600 rounded-lg px-4 py-2">
                    <span className="text-white">{c.name}</span>
                    <button type="button" onClick={() => setCriteria(criteria.filter(x => x.id !== c.id))} className="text-gray-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm">Select criteria or apply a template</p>}
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white">Cancel</button>
          <button onClick={submit} disabled={!name || !prompt || updateTask.isPending} className={cn("px-6 py-2 rounded-lg font-medium", !name || !prompt || updateTask.isPending ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-forge-500 text-white hover:bg-forge-600")}>
            {updateTask.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
