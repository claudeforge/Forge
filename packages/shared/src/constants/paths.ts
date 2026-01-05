/**
 * File paths used by FORGE
 */

/** Base forge directory */
export const FORGE_DIR = ".forge";

/** State file (relative to project root) */
export const STATE_FILE = ".forge/state.json";

/** Config file (project link) */
export const CONFIG_FILE = ".forge.json";

/** Specifications directory */
export const SPECS_DIR = ".forge/specs";

/** Plans directory */
export const PLANS_DIR = ".forge/plans";

/** Task definitions directory (YAML files) */
export const TASK_DEFS_DIR = ".forge/tasks";

/** Tasks execution directory (runtime data) */
export const TASKS_DIR = ".forge/runs";

/** External command file */
export const COMMAND_FILE = ".forge/command.json";

/** Execution status file (queue & status sync) */
export const EXECUTION_FILE = ".forge/execution.json";

/** Log file */
export const LOG_FILE = ".forge/forge.log";

/** Checkpoint directory (deprecated, now per-task) */
export const CHECKPOINTS_DIR = ".forge/checkpoints";

/** Get task directory path */
export function getTaskDir(taskId: string): string {
  return `${TASKS_DIR}/${taskId}`;
}

/** Get task config file path */
export function getTaskConfigPath(taskId: string): string {
  return `${TASKS_DIR}/${taskId}/task.json`;
}

/** Get iterations directory path */
export function getIterationsDir(taskId: string): string {
  return `${TASKS_DIR}/${taskId}/iterations`;
}

/** Get iteration file path */
export function getIterationPath(taskId: string, iterationNum: number): string {
  const padded = String(iterationNum).padStart(3, "0");
  return `${TASKS_DIR}/${taskId}/iterations/${padded}.json`;
}

/** Get task checkpoints directory path */
export function getTaskCheckpointsDir(taskId: string): string {
  return `${TASKS_DIR}/${taskId}/checkpoints`;
}

/** Get task result file path */
export function getTaskResultPath(taskId: string): string {
  return `${TASKS_DIR}/${taskId}/result.json`;
}

// ============================================
// SPEC & PLAN PATHS
// ============================================

/** Get spec file path */
export function getSpecPath(specId: string): string {
  return `${SPECS_DIR}/${specId}.md`;
}

/** Get spec metadata path */
export function getSpecMetaPath(specId: string): string {
  return `${SPECS_DIR}/${specId}.json`;
}

/** Get plan file path */
export function getPlanPath(planId: string): string {
  return `${PLANS_DIR}/${planId}.md`;
}

/** Get plan metadata path */
export function getPlanMetaPath(planId: string): string {
  return `${PLANS_DIR}/${planId}.json`;
}

/** Get task definition file path (YAML) */
export function getTaskDefPath(taskId: string): string {
  return `${TASK_DEFS_DIR}/${taskId}.yaml`;
}

/** Get next spec number */
export function getNextSpecNum(existingSpecs: string[]): number {
  const nums = existingSpecs
    .map(s => s.match(/spec-(\d+)/)?.[1])
    .filter(Boolean)
    .map(n => parseInt(n!, 10));
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

/** Get next plan number */
export function getNextPlanNum(existingPlans: string[]): number {
  const nums = existingPlans
    .map(s => s.match(/plan-(\d+)/)?.[1])
    .filter(Boolean)
    .map(n => parseInt(n!, 10));
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

/** Get next task number */
export function getNextTaskNum(existingTasks: string[]): number {
  const nums = existingTasks
    .map(s => s.match(/t(\d+)/)?.[1])
    .filter(Boolean)
    .map(n => parseInt(n!, 10));
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}
