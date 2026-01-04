/**
 * Validation utilities
 */

import type { ForgeState } from "../types/state.js";
import type { CompletionCriterion, CriterionType } from "../types/criteria.js";

/** Geçerli criterion tipleri */
const VALID_CRITERION_TYPES: CriterionType[] = [
  "promise",
  "command",
  "file-exists",
  "file-contains",
  "test-pass",
  "lint-clean",
  "coverage",
  "custom-script",
];

/** Criterion tipi geçerli mi? */
export function isValidCriterionType(type: string): type is CriterionType {
  return VALID_CRITERION_TYPES.includes(type as CriterionType);
}

/** Criterion objesi geçerli mi? */
export function validateCriterion(criterion: unknown): criterion is CompletionCriterion {
  if (!criterion || typeof criterion !== "object") return false;

  const c = criterion as Record<string, unknown>;

  return (
    typeof c.id === "string" &&
    typeof c.type === "string" &&
    isValidCriterionType(c.type) &&
    typeof c.name === "string" &&
    typeof c.config === "object" &&
    typeof c.weight === "number" &&
    c.weight >= 0 &&
    c.weight <= 1 &&
    typeof c.required === "boolean"
  );
}

/** State objesi geçerli mi? */
export function validateState(state: unknown): state is ForgeState {
  if (!state || typeof state !== "object") return false;

  const s = state as Record<string, unknown>;

  return (
    s.version === "1.0.0" &&
    typeof s.task === "object" &&
    typeof s.iteration === "object" &&
    typeof s.criteria === "object" &&
    typeof s.budget === "object" &&
    typeof s.checkpoints === "object" &&
    typeof s.stuckDetection === "object" &&
    Array.isArray(s.qualityGates) &&
    typeof s.metrics === "object" &&
    typeof s.controlCenter === "object"
  );
}

/** UUID v4 oluştur */
export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
