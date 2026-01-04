/**
 * Completion Criteria Types
 */

// ============================================
// CRITERION TYPES
// ============================================

/** Criterion types */
export type CriterionType =
  | "promise"        // <promise>TEXT</promise> output
  | "command"        // Shell command exit 0
  | "file-exists"    // Does file exist
  | "file-contains"  // Does file contain pattern
  | "test-pass"      // Do tests pass
  | "lint-clean"     // No lint errors
  | "coverage"       // Coverage threshold
  | "custom-script"; // Custom script exit 0

// ============================================
// CONFIG TYPES (for each criterion type)
// ============================================

export interface PromiseConfig {
  /** Text to match within <promise> */
  text: string;
}

export interface CommandConfig {
  /** Command to run */
  cmd: string;
  /** Expected exit code (default: 0) */
  successCode?: number;
}

export interface FileExistsConfig {
  /** File path to check */
  path: string;
}

export interface FileContainsConfig {
  /** File path */
  path: string;
  /** Pattern to search */
  pattern: string;
  /** Is regex? */
  isRegex?: boolean;
}

export interface TestPassConfig {
  /** Test command */
  cmd: string;
  /** Minimum passing test count */
  minPass?: number;
  /** Minimum passing percentage */
  minPassPercent?: number;
}

export interface LintCleanConfig {
  /** Lint command */
  cmd: string;
  /** Maximum allowed errors */
  maxErrors?: number;
}

export interface CoverageConfig {
  /** Coverage command */
  cmd: string;
  /** Minimum coverage % */
  min: number;
}

export interface CustomScriptConfig {
  /** Script path */
  script: string;
  /** Arguments */
  args?: string[];
}

/** Union of all config types */
export type CriterionConfig =
  | PromiseConfig
  | CommandConfig
  | FileExistsConfig
  | FileContainsConfig
  | TestPassConfig
  | LintCleanConfig
  | CoverageConfig
  | CustomScriptConfig;

// ============================================
// CRITERION & RESULT
// ============================================

/** A completion criterion definition */
export interface CompletionCriterion {
  /** Unique ID */
  id: string;
  /** Type */
  type: CriterionType;
  /** Display name */
  name: string;
  /** Type-specific config */
  config: CriterionConfig;
  /** Weight for weighted mode (0-1) */
  weight: number;
  /** Is required? */
  required: boolean;
}

/** Criterion evaluation result */
export interface CriterionResult {
  /** Evaluated criterion */
  criterion: CompletionCriterion;
  /** Did it pass? */
  passed: boolean;
  /** Current value (for display) */
  currentValue?: string;
  /** Target value (for display) */
  targetValue?: string;
  /** Error message */
  error?: string;
}
