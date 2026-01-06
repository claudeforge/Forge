// ../shared/dist/chunk-MAGXV7PA.js
var DEFAULT_STATE = {
  version: "1.0.0",
  iteration: {
    current: 1,
    max: 0,
    currentStartedAt: "",
    history: []
  },
  criteria: {
    mode: "all",
    requiredScore: 0.8,
    items: []
  },
  budget: {
    maxDuration: null,
    maxTokens: null
  },
  checkpoints: {
    auto: {
      enabled: true,
      interval: 10,
      keep: 3
    },
    items: []
  },
  stuckDetection: {
    enabled: true,
    sameOutputThreshold: 3,
    noProgressThreshold: 5,
    strategy: "retry-variation"
  },
  qualityGates: [],
  metrics: {
    totalTokens: 0,
    totalDuration: 0,
    filesCreated: [],
    filesModified: []
  },
  controlCenter: {
    enabled: false,
    url: null,
    projectId: null,
    taskId: null
  }
};
var FORGE_DIR = ".forge";
var STATE_FILE = ".forge/state.json";
var TASK_DEFS_DIR = ".forge/tasks";
var TASKS_DIR = ".forge/runs";
var COMMAND_FILE = ".forge/command.json";
var EXECUTION_FILE = ".forge/execution.json";
var CHECKPOINTS_DIR = ".forge/checkpoints";
function getTaskDir(taskId) {
  return `${TASKS_DIR}/${taskId}`;
}
function getTaskConfigPath(taskId) {
  return `${TASKS_DIR}/${taskId}/task.json`;
}
function getIterationsDir(taskId) {
  return `${TASKS_DIR}/${taskId}/iterations`;
}
function getIterationPath(taskId, iterationNum) {
  const padded = String(iterationNum).padStart(3, "0");
  return `${TASKS_DIR}/${taskId}/iterations/${padded}.json`;
}
function getTaskCheckpointsDir(taskId) {
  return `${TASKS_DIR}/${taskId}/checkpoints`;
}
function getTaskResultPath(taskId) {
  return `${TASKS_DIR}/${taskId}/result.json`;
}
function getTaskDefPath(taskId) {
  return `${TASK_DEFS_DIR}/${taskId}.yaml`;
}

export {
  DEFAULT_STATE,
  FORGE_DIR,
  STATE_FILE,
  TASK_DEFS_DIR,
  COMMAND_FILE,
  EXECUTION_FILE,
  CHECKPOINTS_DIR,
  getTaskDir,
  getTaskConfigPath,
  getIterationsDir,
  getIterationPath,
  getTaskCheckpointsDir,
  getTaskResultPath,
  getTaskDefPath
};
