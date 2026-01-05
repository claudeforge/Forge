/**
 * Edit Task Modal
 *
 * Handles two types of tasks:
 * 1. YAML-linked tasks (have taskDefId) - Show full TaskDef fields
 * 2. Raw prompts (no taskDefId) - Show simple editor + needs_formalization badge
 */

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Zap, Target, Layers, FileCode, ChevronDown, ChevronUp, AlertTriangle, FileText, Sparkles } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api, Task, TaskDef } from "../../lib/api";
import { cn } from "../../lib/utils";

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  projectId?: string;
}

interface Criterion {
  id?: string;
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

const TASK_TYPES = ["feature", "bugfix", "refactor", "test", "docs", "chore"] as const;
const COMPLEXITIES = ["low", "medium", "high"] as const;
const STUCK_STRATEGIES = ["retry-variation", "simplify", "rollback", "abort"] as const;

export function EditTaskModal({ isOpen, onClose, task, projectId }: EditTaskModalProps) {
  const queryClient = useQueryClient();

  // Parse config to get taskDefId
  const config = task?.config ? (typeof task.config === "string" ? JSON.parse(task.config) : task.config) : {};
  const taskDefId = config?.taskDefId as string | undefined;
  const effectiveProjectId = projectId || task?.projectId;

  // Fetch TaskDef if linked
  const { data: taskDef, isLoading: isLoadingTaskDef } = useQuery({
    queryKey: ["taskDef", effectiveProjectId, taskDefId],
    queryFn: () => taskDefId && effectiveProjectId ? api.getTaskDef(effectiveProjectId, taskDefId) : null,
    enabled: !!taskDefId && !!effectiveProjectId && isOpen,
  });

  const isYamlLinked = !!taskDefId;

  // State
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [maxIterations, setMaxIterations] = useState(30);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [customCmd, setCustomCmd] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<typeof TASK_TYPES[number]>("feature");
  const [priority, setPriority] = useState(1);
  const [complexity, setComplexity] = useState<typeof COMPLEXITIES[number]>("medium");
  const [approach, setApproach] = useState("");
  const [filesToCreate, setFilesToCreate] = useState<string[]>([]);
  const [filesToModify, setFilesToModify] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");
  const [newFileCreate, setNewFileCreate] = useState("");
  const [newFileModify, setNewFileModify] = useState("");
  const [checkpointEvery, setCheckpointEvery] = useState(5);
  const [onStuck, setOnStuck] = useState("retry-variation");
  const [timeoutMinutes, setTimeoutMinutes] = useState<number | null>(15);
  const [showTechnical, setShowTechnical] = useState(true);
  const [showExecution, setShowExecution] = useState(false);
  const [showCriteria, setShowCriteria] = useState(true);

  useEffect(() => {
    if (!task) return;
    if (isYamlLinked && taskDef) {
      setTitle(taskDef.title);
      setDescription(taskDef.description);
      setType(taskDef.type);
      setPriority(taskDef.priority);
      setComplexity(taskDef.complexity);
      setApproach(taskDef.technical?.approach || "");
      setFilesToCreate(taskDef.technical?.files_to_create || []);
      setFilesToModify(taskDef.technical?.files_to_modify || []);
      setGoals(taskDef.goals || []);
      setMaxIterations(taskDef.execution?.max_iterations || 15);
      setCheckpointEvery(taskDef.execution?.checkpoint_every || 5);
      setOnStuck(taskDef.execution?.on_stuck || "retry-variation");
      setTimeoutMinutes(taskDef.execution?.timeout_minutes || null);
      setCriteria(taskDef.criteria?.map((c, i) => ({ id: `c${i}`, ...c })) || []);
      setName(task.name);
      setPrompt(task.prompt);
    } else {
      setName(task.name);
      setPrompt(task.prompt);
      setMaxIterations(config?.maxIterations ?? 30);
      setCriteria(config?.criteria?.map((c: Criterion, i: number) => ({ id: `c${i}`, ...c })) || []);
    }
  }, [task, taskDef, isYamlLinked]);

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateTask>[1] }) => api.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      onClose();
    },
  });

  const updateTaskDef = useMutation({
    mutationFn: async (data: Partial<TaskDef>) => {
      if (!effectiveProjectId || !taskDefId) return;
      const res = await fetch(`http://127.0.0.1:3344/api/projects/${effectiveProjectId}/task-defs/${taskDefId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taskDefs", effectiveProjectId] });
      queryClient.invalidateQueries({ queryKey: ["taskDef", effectiveProjectId, taskDefId] });
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

  const addToList = (list: string[], setList: (v: string[]) => void, val: string, setVal: (v: string) => void) => {
    if (val.trim() && !list.includes(val.trim())) { setList([...list, val.trim()]); setVal(""); }
  };

  const removeFromList = (list: string[], setList: (v: string[]) => void, i: number) => {
    setList(list.filter((_, idx) => idx !== i));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    if (isYamlLinked) {
      updateTaskDef.mutate({
        title, description, type, priority, complexity,
        technical: { approach, files_to_create: filesToCreate, files_to_modify: filesToModify, considerations: taskDef?.technical?.considerations || [] },
        goals,
        execution: { max_iterations: maxIterations, checkpoint_every: checkpointEvery, on_stuck: onStuck, timeout_minutes: timeoutMinutes },
        criteria: criteria.map(({ type, name, config }) => ({ type, name, config })),
      });
      updateTask.mutate({ id: task.id, data: { name: title } });
    } else {
      updateTask.mutate({ id: task.id, data: { name, prompt, config: { criteria, maxIterations } } });
    }
  };

  if (!isOpen || !task) return null;

  if (isYamlLinked && isLoadingTaskDef) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8">
          <div className="animate-spin h-8 w-8 border-2 border-forge-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-400 mt-4">Loading task definition...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-white">{isYamlLinked ? "Edit Task Definition" : "Edit Task"}</h2>
              {isYamlLinked ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-forge-500/20 text-forge-400 border border-forge-500/30">
                  <FileCode className="h-3 w-3" />YAML Task
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="h-3 w-3" />Raw Prompt
                </span>
              )}
            </div>
            {isYamlLinked && taskDefId && <p className="text-sm text-gray-400 mt-1 font-mono">{taskDefId}</p>}
            {!isYamlLinked && (
              <p className="text-sm text-amber-400/80 mt-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />Will be formalized when executed by plugin
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {isYamlLinked ? (
            <YamlTaskFields
              title={title} setTitle={setTitle} description={description} setDescription={setDescription}
              type={type} setType={setType} priority={priority} setPriority={setPriority}
              complexity={complexity} setComplexity={setComplexity} approach={approach} setApproach={setApproach}
              filesToCreate={filesToCreate} setFilesToCreate={setFilesToCreate}
              filesToModify={filesToModify} setFilesToModify={setFilesToModify}
              goals={goals} setGoals={setGoals} newGoal={newGoal} setNewGoal={setNewGoal}
              newFileCreate={newFileCreate} setNewFileCreate={setNewFileCreate}
              newFileModify={newFileModify} setNewFileModify={setNewFileModify}
              maxIterations={maxIterations} setMaxIterations={setMaxIterations}
              checkpointEvery={checkpointEvery} setCheckpointEvery={setCheckpointEvery}
              onStuck={onStuck} setOnStuck={setOnStuck}
              timeoutMinutes={timeoutMinutes} setTimeoutMinutes={setTimeoutMinutes}
              criteria={criteria} setCriteria={setCriteria} customCmd={customCmd} setCustomCmd={setCustomCmd}
              showTechnical={showTechnical} setShowTechnical={setShowTechnical}
              showExecution={showExecution} setShowExecution={setShowExecution}
              showCriteria={showCriteria} setShowCriteria={setShowCriteria}
              addToList={addToList} removeFromList={removeFromList} addCriterion={addCriterion} addCustom={addCustom}
            />
          ) : (
            <RawTaskFields
              name={name} setName={setName} prompt={prompt} setPrompt={setPrompt}
              maxIterations={maxIterations} setMaxIterations={setMaxIterations}
              criteria={criteria} setCriteria={setCriteria} customCmd={customCmd} setCustomCmd={setCustomCmd}
              addCriterion={addCriterion} addCustom={addCustom} applyTemplate={applyTemplate}
            />
          )}
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white">Cancel</button>
          <button onClick={submit}
            disabled={isYamlLinked ? (!title || updateTaskDef.isPending) : (!name || !prompt || updateTask.isPending)}
            className={cn("px-6 py-2 rounded-lg font-medium",
              (isYamlLinked ? (!title || updateTaskDef.isPending) : (!name || !prompt || updateTask.isPending))
                ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-forge-500 text-white hover:bg-forge-600")}>
            {(updateTask.isPending || updateTaskDef.isPending) ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function YamlTaskFields(props: any) {
  const {
    title, setTitle, description, setDescription, type, setType, priority, setPriority, complexity, setComplexity,
    approach, setApproach, filesToCreate, setFilesToCreate, filesToModify, setFilesToModify,
    goals, setGoals, newGoal, setNewGoal, newFileCreate, setNewFileCreate, newFileModify, setNewFileModify,
    maxIterations, setMaxIterations, checkpointEvery, setCheckpointEvery, onStuck, setOnStuck, timeoutMinutes, setTimeoutMinutes,
    criteria, setCriteria, customCmd, setCustomCmd, showTechnical, setShowTechnical, showExecution, setShowExecution,
    showCriteria, setShowCriteria, addToList, removeFromList, addCriterion, addCustom
  } = props;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-forge-500 focus:outline-none" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white resize-none focus:border-forge-500 focus:outline-none font-mono text-sm" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-forge-500 focus:outline-none">
            {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Complexity</label>
          <select value={complexity} onChange={(e) => setComplexity(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-forge-500 focus:outline-none">
            {COMPLEXITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
          <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} min={1} max={10}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:border-forge-500 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2"><Target className="inline h-4 w-4 mr-1" />Goals</label>
        <div className="flex gap-2 mb-2">
          <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} placeholder="Add goal..."
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToList(goals, setGoals, newGoal, setNewGoal))} />
          <button type="button" onClick={() => addToList(goals, setGoals, newGoal, setNewGoal)}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"><Plus className="h-5 w-5" /></button>
        </div>
        <div className="space-y-1">
          {goals.map((g: string, i: number) => (
            <div key={i} className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2">
              <span className="text-gray-300 text-sm">{g}</span>
              <button type="button" onClick={() => removeFromList(goals, setGoals, i)} className="text-gray-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <button type="button" onClick={() => setShowTechnical(!showTechnical)}
          className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-300"><FileCode className="h-4 w-4" />Technical Details</span>
          {showTechnical ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {showTechnical && (
          <div className="p-4 space-y-4 border-t border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Approach</label>
              <textarea value={approach} onChange={(e) => setApproach(e.target.value)} rows={6}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white resize-none focus:border-forge-500 focus:outline-none font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Files to Create</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={newFileCreate} onChange={(e) => setNewFileCreate(e.target.value)} placeholder="path/file.ts"
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:border-forge-500 focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToList(filesToCreate, setFilesToCreate, newFileCreate, setNewFileCreate))} />
                  <button type="button" onClick={() => addToList(filesToCreate, setFilesToCreate, newFileCreate, setNewFileCreate)}
                    className="px-3 py-1.5 bg-gray-700 rounded-lg hover:bg-gray-600"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {filesToCreate.map((f: string, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded px-2 py-1">
                      <code className="text-green-400 text-xs">{f}</code>
                      <button type="button" onClick={() => removeFromList(filesToCreate, setFilesToCreate, i)} className="text-gray-500 hover:text-red-400"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Files to Modify</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={newFileModify} onChange={(e) => setNewFileModify(e.target.value)} placeholder="path/file.ts"
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm font-mono focus:border-forge-500 focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToList(filesToModify, setFilesToModify, newFileModify, setNewFileModify))} />
                  <button type="button" onClick={() => addToList(filesToModify, setFilesToModify, newFileModify, setNewFileModify)}
                    className="px-3 py-1.5 bg-gray-700 rounded-lg hover:bg-gray-600"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {filesToModify.map((f: string, i: number) => (
                    <div key={i} className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1">
                      <code className="text-yellow-400 text-xs">{f}</code>
                      <button type="button" onClick={() => removeFromList(filesToModify, setFilesToModify, i)} className="text-gray-500 hover:text-red-400"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <button type="button" onClick={() => setShowExecution(!showExecution)}
          className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-300"><Zap className="h-4 w-4" />Execution Settings</span>
          {showExecution ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {showExecution && (
          <div className="p-4 grid grid-cols-2 gap-4 border-t border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Iterations</label>
              <input type="number" value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))} min={1} max={100}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Checkpoint Every</label>
              <input type="number" value={checkpointEvery} onChange={(e) => setCheckpointEvery(Number(e.target.value))} min={1} max={50}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">On Stuck</label>
              <select value={onStuck} onChange={(e) => setOnStuck(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none">
                {STUCK_STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Timeout (min)</label>
              <input type="number" value={timeoutMinutes || ""} onChange={(e) => setTimeoutMinutes(e.target.value ? Number(e.target.value) : null)} min={1} placeholder="None"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-forge-500 focus:outline-none" />
            </div>
          </div>
        )}
      </div>

      <div className="border border-gray-700 rounded-lg overflow-hidden">
        <button type="button" onClick={() => setShowCriteria(!showCriteria)}
          className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800">
          <span className="flex items-center gap-2 text-sm font-medium text-gray-300"><Layers className="h-4 w-4" />Success Criteria ({criteria.length})</span>
          {showCriteria ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {showCriteria && (
          <div className="p-4 space-y-3 border-t border-gray-700">
            <div className="flex flex-wrap gap-2">
              {CRITERION_PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => addCriterion(p)}
                  className={cn("px-3 py-1.5 rounded-lg text-sm font-medium",
                    criteria.some((c: Criterion) => c.name === p.name) ? "bg-forge-500/20 text-forge-400 border border-forge-500/50" : "bg-gray-700 text-gray-300 hover:bg-gray-600")}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={customCmd} onChange={(e) => setCustomCmd(e.target.value)} placeholder="Custom command..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-forge-500 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())} />
              <button type="button" onClick={addCustom} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              {criteria.map((c: Criterion, i: number) => (
                <div key={c.id || i} className="flex items-center justify-between bg-gray-800 border border-gray-600 rounded-lg px-4 py-2">
                  <div><span className="text-white">{c.name}</span><span className="text-gray-500 text-xs ml-2">({c.type})</span></div>
                  <button type="button" onClick={() => setCriteria(criteria.filter((_: Criterion, idx: number) => idx !== i))} className="text-gray-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RawTaskFields(props: any) {
  const { name, setName, prompt, setPrompt, maxIterations, setMaxIterations, criteria, setCriteria, customCmd, setCustomCmd, addCriterion, addCustom, applyTemplate } = props;

  return (
    <>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-amber-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-300">Raw Prompt Task</h4>
            <p className="text-sm text-gray-400 mt-1">
              This task will be automatically formalized into a proper spec when the plugin processes it.
              For full control, use the FORGE workflow to create proper task definitions.
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Task Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Add auth"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-forge-500 focus:outline-none" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the task..." rows={6}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 resize-none focus:border-forge-500 focus:outline-none" required />
      </div>

      <div className="bg-forge-500/10 border border-forge-500/30 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="h-5 w-5 text-forge-400" />
          <label className="text-sm font-medium text-forge-300">Max Iterations</label>
        </div>
        <div className="flex items-center gap-4">
          <input type="range" value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))} min={1} max={100} className="flex-1 accent-forge-500" />
          <input type="number" value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value) || 30)} min={1} max={100}
            className="w-20 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-center focus:border-forge-500 focus:outline-none" />
        </div>
        <p className="text-xs text-gray-500 mt-2">Number of times Claude will iterate until success criteria are met</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Success Criteria</label>
        <div className="mb-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Templates</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {CRITERIA_TEMPLATES.map((t) => (
              <button key={t.label} type="button" onClick={() => applyTemplate(t)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30">
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {CRITERION_PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => addCriterion(p)}
              className={cn("px-3 py-1.5 rounded-lg text-sm font-medium",
                criteria.some((c: Criterion) => c.name === p.name) ? "bg-forge-500/20 text-forge-400 border border-forge-500/50" : "bg-gray-700 text-gray-300 hover:bg-gray-600")}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          <input type="text" value={customCmd} onChange={(e) => setCustomCmd(e.target.value)} placeholder="Custom command"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-forge-500 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())} />
          <button type="button" onClick={addCustom} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"><Plus className="h-5 w-5" /></button>
        </div>
        {criteria.length > 0 ? (
          <div className="space-y-2">
            {criteria.map((c: Criterion) => (
              <div key={c.id} className="flex items-center justify-between bg-gray-800 border border-gray-600 rounded-lg px-4 py-2">
                <span className="text-white">{c.name}</span>
                <button type="button" onClick={() => setCriteria(criteria.filter((x: Criterion) => x.id !== c.id))} className="text-gray-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        ) : <p className="text-gray-500 text-sm">Select criteria or apply a template</p>}
      </div>
    </>
  );
}
