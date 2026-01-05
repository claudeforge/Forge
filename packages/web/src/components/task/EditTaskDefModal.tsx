/**
 * Edit TaskDef Modal - Full task definition editing
 */
import { useState, useEffect } from "react";
import { X, Plus, Trash2, Zap, Target, Layers, FileCode, ChevronDown, ChevronUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "../../lib/utils";

interface TaskTechnical { approach: string; files_to_create: string[]; files_to_modify: string[]; considerations: string[]; }
interface TaskExecution { max_iterations: number; checkpoint_every: number; on_stuck: string; timeout_minutes: number | null; }
interface TaskCriterion { type: string; name: string; config: Record<string, unknown>; }
interface TaskDef { id: string; title: string; description: string; depends_on: string[]; blocks: string[]; type: "feature"|"bugfix"|"refactor"|"test"|"docs"|"chore"; priority: number; complexity: "low"|"medium"|"high"; technical: TaskTechnical; criteria: TaskCriterion[]; execution: TaskExecution; goals: string[]; status: string; spec_id: string|null; plan_id: string|null; }
interface EditTaskDefModalProps { isOpen: boolean; onClose: () => void; taskDef: TaskDef | null; projectId: string; onSave?: (updated: Partial<TaskDef>) => void; }

const TASK_TYPES = ["feature", "bugfix", "refactor", "test", "docs", "chore"] as const;
const COMPLEXITIES = ["low", "medium", "high"] as const;
const STUCK_STRATEGIES = ["retry-variation", "simplify", "rollback", "abort"] as const;
const CRITERION_PRESETS = [
  { label: "Tests Pass", type: "test-pass", name: "Tests Pass", config: { cmd: "npm test" } },
  { label: "Lint Clean", type: "lint-clean", name: "Lint Clean", config: { cmd: "npm run lint" } },
  { label: "Build", type: "command", name: "Build", config: { cmd: "npm run build" } },
  { label: "TypeCheck", type: "command", name: "TypeCheck", config: { cmd: "npm run typecheck" } },
];

export function EditTaskDefModal({ isOpen, onClose, taskDef, projectId, onSave }: EditTaskDefModalProps) {
  const queryClient = useQueryClient();
  const [showTechnical, setShowTechnical] = useState(true);
  const [showExecution, setShowExecution] = useState(false);
  const [showCriteria, setShowCriteria] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskDef["type"]>("feature");
  const [priority, setPriority] = useState(1);
  const [complexity, setComplexity] = useState<TaskDef["complexity"]>("medium");
  const [approach, setApproach] = useState("");
  const [filesToCreate, setFilesToCreate] = useState<string[]>([]);
  const [filesToModify, setFilesToModify] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [newFileCreate, setNewFileCreate] = useState("");
  const [newFileModify, setNewFileModify] = useState("");
  const [maxIterations, setMaxIterations] = useState(15);
  const [checkpointEvery, setCheckpointEvery] = useState(5);
  const [onStuck, setOnStuck] = useState("retry-variation");
  const [timeoutMinutes, setTimeoutMinutes] = useState<number | null>(15);
  const [criteria, setCriteria] = useState<TaskCriterion[]>([]);
  const [customCmd, setCustomCmd] = useState("");


  useEffect(() => {
    if (taskDef) {
      setTitle(taskDef.title); setDescription(taskDef.description); setType(taskDef.type);
      setPriority(taskDef.priority); setComplexity(taskDef.complexity);
      setApproach(taskDef.technical?.approach || "");
      setFilesToCreate(taskDef.technical?.files_to_create || []);
      setFilesToModify(taskDef.technical?.files_to_modify || []);
      setGoals(taskDef.goals || []);
      setMaxIterations(taskDef.execution?.max_iterations || 15);
      setCheckpointEvery(taskDef.execution?.checkpoint_every || 5);
      setOnStuck(taskDef.execution?.on_stuck || "retry-variation");
      setTimeoutMinutes(taskDef.execution?.timeout_minutes || null);
      setCriteria(taskDef.criteria || []);
    }
  }, [taskDef]);

  const updateTaskDef = useMutation({
    mutationFn: async (data: Partial<TaskDef>) => {
      const res = await fetch(`http://127.0.0.1:3344/api/projects/${projectId}/task-defs/${taskDef?.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed"); return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["taskDefs", projectId] }); onClose(); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Partial<TaskDef> = { title, description, type, priority, complexity,
      technical: { approach, files_to_create: filesToCreate, files_to_modify: filesToModify, considerations: [] },
      goals, execution: { max_iterations: maxIterations, checkpoint_every: checkpointEvery, on_stuck: onStuck, timeout_minutes: timeoutMinutes }, criteria };
    if (onSave) { onSave(data); onClose(); } else { updateTaskDef.mutate(data); }
  };

  const addToList = (list: string[], setList: (v: string[]) => void, val: string, setVal: (v: string) => void) => { if (val.trim() && !list.includes(val.trim())) { setList([...list, val.trim()]); setVal(""); } };
  const removeFromList = (list: string[], setList: (v: string[]) => void, i: number) => { setList(list.filter((_, idx) => idx !== i)); };
  const addCriterion = (p: typeof CRITERION_PRESETS[number]) => { if (!criteria.some(c => c.name === p.name)) setCriteria([...criteria, { type: p.type, name: p.name, config: p.config }]); };
  const addCustomCriterion = () => { if (customCmd.trim()) { setCriteria([...criteria, { type: "command", name: customCmd, config: { cmd: customCmd } }]); setCustomCmd(""); } };

  if (!isOpen || !taskDef) return null;


  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div><h2 className="text-xl font-semibold text-white">Edit Task Definition</h2><p className="text-sm text-gray-400 mt-1">{taskDef.id}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-300 mb-2">Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-forge-500 focus:outline-none" required /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-300 mb-2">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white resize-none focus:border-forge-500 focus:outline-none font-mono text-sm" required /></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Type</label><select value={type} onChange={(e) => setType(e.target.value as TaskDef["type"])} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-forge-500 focus:outline-none">{TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Complexity</label><select value={complexity} onChange={(e) => setComplexity(e.target.value as TaskDef["complexity"])} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-forge-500 focus:outline-none">{COMPLEXITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-300 mb-2">Priority</label><input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} min={1} max={10} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-forge-500 focus:outline-none" /></div>
          </div>

          <div><label className="block text-sm font-medium text-gray-300 mb-2"><Target className="inline h-4 w-4 mr-1" />Goals</label>
            <div className="flex gap-2 mb-2"><input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="Add goal..." className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToList(goals, setGoals, newGoal, setNewGoal))} /><button type="button" onClick={() => addToList(goals, setGoals, newGoal, setNewGoal)} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"><Plus className="h-5 w-5" /></button></div>
            <div className="space-y-1">{goals.map((g, i) => (<div key={i} className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"><span className="text-gray-300 text-sm">{g}</span><button type="button" onClick={() => removeFromList(goals, setGoals, i)} className="text-gray-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div>))}</div>
          </div>


          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button type="button" onClick={() => setShowTechnical(!showTechnical)} className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800"><span className="flex items-center gap-2 text-sm font-medium text-gray-300"><FileCode className="h-4 w-4" />Technical</span>{showTechnical ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}</button>
            {showTechnical && (<div className="p-4 space-y-4 border-t border-gray-700">
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Approach</label><textarea value={approach} onChange={(e) => setApproach(e.target.value)} rows={6} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white resize-none focus:border-forge-500 focus:outline-none font-mono text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Files to Create</label><div className="flex gap-2 mb-2"><input type="text" value={newFileCreate} onChange={(e) => setNewFileCreate(e.target.value)} placeholder="path/file.ts" className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:border-forge-500 focus:outline-none" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToList(filesToCreate, setFilesToCreate, newFileCreate, setNewFileCreate))} /><button type="button" onClick={() => addToList(filesToCreate, setFilesToCreate, newFileCreate, setNewFileCreate)} className="px-3 py-1.5 bg-gray-700 rounded-lg hover:bg-gray-600"><Plus className="h-4 w-4" /></button></div><div className="space-y-1 max-h-32 overflow-y-auto">{filesToCreate.map((f, i) => (<div key={i} className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded px-2 py-1"><code className="text-green-400 text-xs">{f}</code><button type="button" onClick={() => removeFromList(filesToCreate, setFilesToCreate, i)} className="text-gray-500 hover:text-red-400"><X className="h-3 w-3" /></button></div>))}</div></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-2">Files to Modify</label><div className="flex gap-2 mb-2"><input type="text" value={newFileModify} onChange={(e) => setNewFileModify(e.target.value)} placeholder="path/file.ts" className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:border-forge-500 focus:outline-none" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToList(filesToModify, setFilesToModify, newFileModify, setNewFileModify))} /><button type="button" onClick={() => addToList(filesToModify, setFilesToModify, newFileModify, setNewFileModify)} className="px-3 py-1.5 bg-gray-700 rounded-lg hover:bg-gray-600"><Plus className="h-4 w-4" /></button></div><div className="space-y-1 max-h-32 overflow-y-auto">{filesToModify.map((f, i) => (<div key={i} className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1"><code className="text-yellow-400 text-xs">{f}</code><button type="button" onClick={() => removeFromList(filesToModify, setFilesToModify, i)} className="text-gray-500 hover:text-red-400"><X className="h-3 w-3" /></button></div>))}</div></div>
              </div>
            </div>)}
          </div>


          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button type="button" onClick={() => setShowExecution(!showExecution)} className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800"><span className="flex items-center gap-2 text-sm font-medium text-gray-300"><Zap className="h-4 w-4" />Execution</span>{showExecution ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}</button>
            {showExecution && (<div className="p-4 grid grid-cols-2 gap-4 border-t border-gray-700">
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Max Iterations</label><input type="number" value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))} min={1} max={100} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Checkpoint Every</label><input type="number" value={checkpointEvery} onChange={(e) => setCheckpointEvery(Number(e.target.value))} min={1} max={50} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">On Stuck</label><select value={onStuck} onChange={(e) => setOnStuck(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none">{STUCK_STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-300 mb-2">Timeout (min)</label><input type="number" value={timeoutMinutes || ""} onChange={(e) => setTimeoutMinutes(e.target.value ? Number(e.target.value) : null)} min={1} placeholder="None" className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none" /></div>
            </div>)}
          </div>

          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <button type="button" onClick={() => setShowCriteria(!showCriteria)} className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800"><span className="flex items-center gap-2 text-sm font-medium text-gray-300"><Layers className="h-4 w-4" />Criteria ({criteria.length})</span>{showCriteria ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}</button>
            {showCriteria && (<div className="p-4 space-y-3 border-t border-gray-700">
              <div className="flex flex-wrap gap-2">{CRITERION_PRESETS.map((p) => (<button key={p.label} type="button" onClick={() => addCriterion(p)} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", criteria.some(c => c.name === p.name) ? "bg-forge-500/20 text-forge-400 border border-forge-500/50" : "bg-gray-700 text-gray-300 hover:bg-gray-600")}>{p.label}</button>))}</div>
              <div className="flex gap-2"><input type="text" value={customCmd} onChange={(e) => setCustomCmd(e.target.value)} placeholder="Custom command..." className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-forge-500 focus:outline-none" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomCriterion())} /><button type="button" onClick={addCustomCriterion} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"><Plus className="h-4 w-4" /></button></div>
              <div className="space-y-2">{criteria.map((c, i) => (<div key={i} className="flex items-center justify-between bg-gray-800 border border-gray-600 rounded-lg px-4 py-2"><div><span className="text-white">{c.name}</span><span className="text-gray-500 text-xs ml-2">({c.type})</span></div><button type="button" onClick={() => setCriteria(criteria.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            </div>)}
          </div>
        </form>
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white">Cancel</button>
          <button onClick={handleSubmit} disabled={!title || updateTaskDef.isPending} className={cn("px-6 py-2 rounded-lg font-medium", !title || updateTaskDef.isPending ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-forge-500 text-white hover:bg-forge-600")}>{updateTaskDef.isPending ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

