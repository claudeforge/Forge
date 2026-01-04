/**
 * State management
 * Reads/writes .claude/forge-state.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import type { ForgeState } from "@claudeforge/forge-shared";
import { STATE_FILE } from "@claudeforge/forge-shared/constants";
import { validateState } from "@claudeforge/forge-shared/utils";

/**
 * Load state from file
 * Returns null if file doesn't exist or is invalid
 */
export function loadState(): ForgeState | null {
  if (!existsSync(STATE_FILE)) return null;

  try {
    const content = readFileSync(STATE_FILE, "utf-8");
    const state = JSON.parse(content);

    if (!validateState(state)) {
      console.error("[FORGE] Invalid state file format");
      return null;
    }

    return state;
  } catch (error) {
    console.error("[FORGE] Failed to load state:", error);
    return null;
  }
}

/**
 * Save state to file
 */
export function saveState(state: ForgeState): boolean {
  try {
    const dir = dirname(STATE_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    return true;
  } catch (error) {
    console.error("[FORGE] Failed to save state:", error);
    return false;
  }
}

/**
 * Delete state file
 */
export function deleteState(): void {
  if (existsSync(STATE_FILE)) {
    unlinkSync(STATE_FILE);
  }
}

/**
 * Check if forge loop is active
 */
export function isForgeActive(): boolean {
  const state = loadState();
  return state !== null && state.task.status === "running";
}
