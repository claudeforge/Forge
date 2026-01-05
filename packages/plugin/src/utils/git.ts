/**
 * Git utilities for checkpoints
 */

import { git } from "./shell.js";

/**
 * Check if current directory is a git repo
 */
export function isGitRepo(): boolean {
  const result = git(["rev-parse", "--is-inside-work-tree"]);
  return result.success && result.stdout === "true";
}

/**
 * Create a git stash with message
 * Returns stash reference or null on failure
 */
export function createStash(message: string): string | null {
  if (!isGitRepo()) return null;

  // Check if there are any changes to stash
  const statusResult = git(["status", "--porcelain"]);
  if (!statusResult.success || !statusResult.stdout.trim()) {
    // No changes to stash - this is not a failure, just nothing to do
    // Return a special marker so callers know a "checkpoint" exists (clean state)
    return "clean";
  }

  // Stage all changes including untracked
  git(["add", "-A"]);

  // Create stash
  const result = git(["stash", "push", "-m", message, "--include-untracked"]);

  // Check for "No local changes to save" message
  if (!result.success || result.stdout.includes("No local changes to save")) {
    // Already clean state
    return "clean";
  }

  // Get stash ref - use stash@{0} format which is more reliable
  const refResult = git(["rev-parse", "stash@{0}"]);
  if (refResult.success && refResult.stdout.trim()) {
    return refResult.stdout.trim();
  }

  // Fallback to stash@{0} reference
  return "stash@{0}";
}

/**
 * Apply a stash by ref
 */
export function applyStash(ref: string): boolean {
  // "clean" means there was nothing to stash - nothing to apply
  if (ref === "clean" || ref === "none") {
    return true;
  }

  const result = git(["stash", "apply", ref]);
  return result.success;
}

/**
 * Drop a stash by ref
 */
export function dropStash(ref: string): boolean {
  const result = git(["stash", "drop", ref]);
  return result.success;
}

/**
 * Get list of changed files (created and modified)
 */
export function getChangedFiles(): { created: string[]; modified: string[] } {
  const created: string[] = [];
  const modified: string[] = [];

  if (!isGitRepo()) return { created, modified };

  // Untracked (new) files
  const untrackedResult = git(["ls-files", "--others", "--exclude-standard"]);
  if (untrackedResult.success && untrackedResult.stdout) {
    created.push(...untrackedResult.stdout.split("\n").filter(Boolean));
  }

  // Modified files
  const modifiedResult = git(["diff", "--name-only"]);
  if (modifiedResult.success && modifiedResult.stdout) {
    modified.push(...modifiedResult.stdout.split("\n").filter(Boolean));
  }

  // Staged modified files
  const stagedResult = git(["diff", "--cached", "--name-only"]);
  if (stagedResult.success && stagedResult.stdout) {
    const staged = stagedResult.stdout.split("\n").filter(Boolean);
    for (const file of staged) {
      if (!modified.includes(file)) {
        modified.push(file);
      }
    }
  }

  return { created, modified };
}
