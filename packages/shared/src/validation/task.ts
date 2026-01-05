/**
 * Task Definition Validation
 * Validates task YAML files before queuing
 */

import type { TaskDefinition, TaskType, TaskComplexity, TaskFileStatus } from "../types/spec.js";

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

const VALID_TASK_TYPES: TaskType[] = ["feature", "bugfix", "refactor", "test", "docs", "chore"];
const VALID_COMPLEXITIES: TaskComplexity[] = ["low", "medium", "high"];
const VALID_STATUSES: TaskFileStatus[] = [
  "pending",
  "queued",
  "blocked",
  "running",
  "completed",
  "failed",
  "skipped",
];
const VALID_STUCK_STRATEGIES = ["retry", "retry-variation", "checkpoint", "stop", "ask"];
const VALID_CRITERION_TYPES = [
  "test_pass",
  "type_check",
  "lint_pass",
  "file_exists",
  "file_contains",
  "build_success",
  "manual",
  "custom",
];

/**
 * Validate a task definition
 */
export function validateTaskDefinition(task: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!task || typeof task !== "object") {
    errors.push({ field: "root", message: "Task must be an object", severity: "error" });
    return { valid: false, errors, warnings };
  }

  const t = task as Record<string, unknown>;

  // Required fields
  validateRequired(t, "id", "string", errors);
  validateRequired(t, "title", "string", errors);
  validateRequired(t, "description", "string", errors);
  validateRequired(t, "type", "string", errors);
  validateRequired(t, "status", "string", errors);

  // ID format
  if (typeof t.id === "string" && !/^t\d{3}$/.test(t.id)) {
    warnings.push({
      field: "id",
      message: "ID should follow format tNNN (e.g., t001)",
      severity: "warning",
    });
  }

  // Type validation
  if (typeof t.type === "string" && !VALID_TASK_TYPES.includes(t.type as TaskType)) {
    errors.push({
      field: "type",
      message: `Invalid type. Must be one of: ${VALID_TASK_TYPES.join(", ")}`,
      severity: "error",
    });
  }

  // Complexity validation
  if (t.complexity !== undefined) {
    if (!VALID_COMPLEXITIES.includes(t.complexity as TaskComplexity)) {
      errors.push({
        field: "complexity",
        message: `Invalid complexity. Must be one of: ${VALID_COMPLEXITIES.join(", ")}`,
        severity: "error",
      });
    }
  }

  // Status validation
  if (typeof t.status === "string" && !VALID_STATUSES.includes(t.status as TaskFileStatus)) {
    errors.push({
      field: "status",
      message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      severity: "error",
    });
  }

  // Priority validation
  if (t.priority !== undefined) {
    if (typeof t.priority !== "number" || t.priority < 1) {
      errors.push({
        field: "priority",
        message: "Priority must be a positive number (1 = highest)",
        severity: "error",
      });
    }
  }

  // Dependencies validation
  if (t.depends_on !== undefined) {
    if (!Array.isArray(t.depends_on)) {
      errors.push({
        field: "depends_on",
        message: "depends_on must be an array",
        severity: "error",
      });
    } else {
      for (const dep of t.depends_on) {
        if (typeof dep !== "string") {
          errors.push({
            field: "depends_on",
            message: "All dependencies must be strings",
            severity: "error",
          });
          break;
        }
      }
    }
  }

  // Technical section
  if (t.technical !== undefined) {
    if (typeof t.technical !== "object" || t.technical === null) {
      errors.push({
        field: "technical",
        message: "technical must be an object",
        severity: "error",
      });
    } else {
      const tech = t.technical as Record<string, unknown>;

      if (tech.files_to_create !== undefined && !Array.isArray(tech.files_to_create)) {
        errors.push({
          field: "technical.files_to_create",
          message: "files_to_create must be an array",
          severity: "error",
        });
      }

      if (tech.files_to_modify !== undefined && !Array.isArray(tech.files_to_modify)) {
        errors.push({
          field: "technical.files_to_modify",
          message: "files_to_modify must be an array",
          severity: "error",
        });
      }

      if (tech.considerations !== undefined && !Array.isArray(tech.considerations)) {
        errors.push({
          field: "technical.considerations",
          message: "considerations must be an array",
          severity: "error",
        });
      }
    }
  } else {
    warnings.push({
      field: "technical",
      message: "Missing technical section",
      severity: "warning",
    });
  }

  // Criteria validation
  if (t.criteria !== undefined) {
    if (!Array.isArray(t.criteria)) {
      errors.push({
        field: "criteria",
        message: "criteria must be an array",
        severity: "error",
      });
    } else {
      for (let i = 0; i < t.criteria.length; i++) {
        const criterion = t.criteria[i] as Record<string, unknown>;

        if (!criterion.type || typeof criterion.type !== "string") {
          errors.push({
            field: `criteria[${i}].type`,
            message: "Criterion must have a type",
            severity: "error",
          });
        } else if (!VALID_CRITERION_TYPES.includes(criterion.type)) {
          errors.push({
            field: `criteria[${i}].type`,
            message: `Invalid criterion type. Must be one of: ${VALID_CRITERION_TYPES.join(", ")}`,
            severity: "error",
          });
        }

        if (!criterion.name || typeof criterion.name !== "string") {
          errors.push({
            field: `criteria[${i}].name`,
            message: "Criterion must have a name",
            severity: "error",
          });
        }
      }
    }
  } else {
    warnings.push({
      field: "criteria",
      message: "No success criteria defined",
      severity: "warning",
    });
  }

  // Execution config validation
  if (t.execution !== undefined) {
    if (typeof t.execution !== "object" || t.execution === null) {
      errors.push({
        field: "execution",
        message: "execution must be an object",
        severity: "error",
      });
    } else {
      const exec = t.execution as Record<string, unknown>;

      if (exec.max_iterations !== undefined) {
        if (typeof exec.max_iterations !== "number" || exec.max_iterations < 1) {
          errors.push({
            field: "execution.max_iterations",
            message: "max_iterations must be a positive number",
            severity: "error",
          });
        } else if (exec.max_iterations > 100) {
          warnings.push({
            field: "execution.max_iterations",
            message: "max_iterations > 100 may be excessive",
            severity: "warning",
          });
        }
      }

      if (exec.on_stuck !== undefined) {
        if (!VALID_STUCK_STRATEGIES.includes(exec.on_stuck as string)) {
          errors.push({
            field: "execution.on_stuck",
            message: `Invalid on_stuck strategy. Must be one of: ${VALID_STUCK_STRATEGIES.join(", ")}`,
            severity: "error",
          });
        }
      }

      if (exec.timeout_minutes !== undefined && exec.timeout_minutes !== null) {
        if (typeof exec.timeout_minutes !== "number" || exec.timeout_minutes < 1) {
          errors.push({
            field: "execution.timeout_minutes",
            message: "timeout_minutes must be a positive number or null",
            severity: "error",
          });
        }
      }
    }
  }

  // Goals validation
  if (t.goals !== undefined) {
    if (!Array.isArray(t.goals)) {
      errors.push({
        field: "goals",
        message: "goals must be an array",
        severity: "error",
      });
    } else if (t.goals.length === 0) {
      warnings.push({
        field: "goals",
        message: "No goals defined",
        severity: "warning",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate required field
 */
function validateRequired(
  obj: Record<string, unknown>,
  field: string,
  type: string,
  errors: ValidationError[]
): void {
  if (obj[field] === undefined || obj[field] === null) {
    errors.push({
      field,
      message: `Missing required field: ${field}`,
      severity: "error",
    });
  } else if (typeof obj[field] !== type) {
    errors.push({
      field,
      message: `${field} must be a ${type}`,
      severity: "error",
    });
  }
}

/**
 * Validate dependency graph for cycles
 */
export function validateDependencyGraph(
  tasks: Map<string, TaskDefinition>
): ValidationError[] {
  const errors: ValidationError[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(taskId: string, path: string[]): boolean {
    if (recursionStack.has(taskId)) {
      errors.push({
        field: "depends_on",
        message: `Circular dependency detected: ${[...path, taskId].join(" -> ")}`,
        severity: "error",
      });
      return true;
    }

    if (visited.has(taskId)) {
      return false;
    }

    visited.add(taskId);
    recursionStack.add(taskId);

    const task = tasks.get(taskId);
    if (task) {
      for (const depId of task.depends_on) {
        if (!tasks.has(depId)) {
          errors.push({
            field: "depends_on",
            message: `Task ${taskId} depends on unknown task: ${depId}`,
            severity: "error",
          });
        } else if (hasCycle(depId, [...path, taskId])) {
          return true;
        }
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  for (const taskId of tasks.keys()) {
    if (!visited.has(taskId)) {
      hasCycle(taskId, []);
    }
  }

  return errors;
}

/**
 * Format validation result for display
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push("Validation passed");
  } else {
    lines.push("Validation failed");
  }

  if (result.errors.length > 0) {
    lines.push("");
    lines.push("Errors:");
    for (const error of result.errors) {
      lines.push(`  [ERROR] ${error.field}: ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of result.warnings) {
      lines.push(`  [WARN] ${warning.field}: ${warning.message}`);
    }
  }

  return lines.join("\n");
}
