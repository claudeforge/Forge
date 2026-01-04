/**
 * Create Task Modal
 */

import { useState } from "react";
import { X, Plus, Trash2, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
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

export function CreateTaskModal({ isOpen, onClose, defaultProjectId }: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: api.getProjects });

  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [maxIterations, setMaxIterations] = useState(30);
  const [maxCost, setMaxCost] = useState<number | undefined>();
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [customCmd, setCustomCmd] = useState("");

  const createTask = useMutation({
    mutationFn: api.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      setName(""); setPrompt(""); setCriteria([]);
      onClose();
    },
  });

  const addCriterion = (p: typeof CRITERION_PRESETS[number]) => {
    if (criteria.some(c => c.name === p.name)) return;
    setCriteria([...criteria, { id: "c" + criteria.length, type: p.type, name: p.name, config: p.config }]);
  };

  const addCustom = () => {
    if (!customCmd.trim()) return;
    setCriteria([...criteria, { id: "c" + criteria.length, type: "command", name: customCmd, config: { cmd: customCmd } }]);
    setCustomCmd("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !name || !prompt) return;
    createTask.mutate({
      projectId, name, prompt,
      config: { criteria, maxIterations, maxCost: maxCost || null },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Create New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white" required>
              <option value="">Select...</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {projects?.length === 0 && <p className="text-yellow-400 text-sm mt-2"><AlertCircle className="h-4 w-4 inline" /> No projects yet</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Task Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Add auth" className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the task..." rows={4} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 resize-none" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Success Criteria</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {CRITERION_PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => addCriterion(p)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", criteria.some(c => c.name === p.name) ? "bg-forge-500/20 text-forge-400 border border-forge-500/50" : "bg-gray-700 text-gray-300 hover:bg-gray-600")}>{p.label}</button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              <input type="text" value={customCmd} onChange={(e) => setCustomCmd(e.target.value)} placeholder="Custom command" className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())} />
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
            ) : <p className="text-gray-500 text-sm">Select criteria</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Iterations</label>
              <input type="number" value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value) || 30)} min={1} max={100} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Cost ($)</label>
              <input type="number" value={maxCost || ""} onChange={(e) => setMaxCost(e.target.value ? Number(e.target.value) : undefined)} min={0} step={0.5} placeholder="No limit" className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500" />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white">Cancel</button>
          <button onClick={submit} disabled={!projectId || !name || !prompt || createTask.isPending} className={cn("px-6 py-2 rounded-lg font-medium", !projectId || !name || !prompt || createTask.isPending ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-forge-500 text-white hover:bg-forge-600")}>
            {createTask.isPending ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
