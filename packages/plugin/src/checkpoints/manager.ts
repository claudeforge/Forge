/**
 * Checkpoint management
 */

import {
  mkdirSync,
  existsSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import type { ForgeState, Checkpoint } from "@claudeforge/forge-shared";
import { CHECKPOINTS_DIR } from "@claudeforge/forge-shared/constants";
import { generateId } from "@claudeforge/forge-shared/utils";
import { createStash, applyStash } from "../utils/git.js";
import { saveState } from "../core/state.js";

/**
 * Create a new checkpoint
 */
export async function createCheckpoint(
  state: ForgeState,
  type: "auto" | "manual"
): Promise<Checkpoint | null> {
  // Ensure checkpoint directory exists
  if (!existsSync(CHECKPOINTS_DIR)) {
    mkdirSync(CHECKPOINTS_DIR, { recursive: true });
  }

  // Create git stash for code snapshot
  const stashMessage = `forge-checkpoint-iter-${state.iteration.current}`;
  const gitRef = createStash(stashMessage);

  if (!gitRef) {
    console.error("[FORGE] Failed to create git stash for checkpoint");
    // Continue anyway, checkpoint might still be useful
  }

  // Create checkpoint record
  const checkpoint: Checkpoint = {
    id: generateId(),
    iteration: state.iteration.current,
    createdAt: new Date().toISOString(),
    type,
    gitRef: gitRef ?? "none",
    metrics: { ...state.metrics },
  };

  // Save checkpoint metadata
  const checkpointFile = join(CHECKPOINTS_DIR, `${checkpoint.id}.json`);
  writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));

  // Add to state
  state.checkpoints.items.push(checkpoint);

  // Prune old checkpoints if needed
  pruneOldCheckpoints(state);

  // Save updated state
  saveState(state);

  return checkpoint;
}

/**
 * Rollback to a specific checkpoint
 */
export async function rollbackToCheckpoint(
  checkpointId: string,
  state: ForgeState
): Promise<boolean> {
  const checkpoint = state.checkpoints.items.find((c) => c.id === checkpointId);

  if (!checkpoint) {
    console.error(`[FORGE] Checkpoint not found: ${checkpointId}`);
    return false;
  }

  // Apply git stash if available
  if (checkpoint.gitRef && checkpoint.gitRef !== "none") {
    const success = applyStash(checkpoint.gitRef);
    if (!success) {
      console.error("[FORGE] Failed to apply git stash");
      // Continue anyway, state rollback might still help
    }
  }

  // Restore metrics
  state.metrics = { ...checkpoint.metrics };

  // Reset iteration to checkpoint point
  state.iteration.current = checkpoint.iteration;

  // Remove history after checkpoint
  state.iteration.history = state.iteration.history.filter(
    (h) => h.n <= checkpoint.iteration
  );

  saveState(state);

  return true;
}

/**
 * Rollback to the most recent checkpoint
 */
export async function rollbackToLatestCheckpoint(
  state: ForgeState
): Promise<boolean> {
  if (state.checkpoints.items.length === 0) {
    return false;
  }

  // Get most recent checkpoint
  const sorted = [...state.checkpoints.items].sort(
    (a, b) => b.iteration - a.iteration
  );
  const latest = sorted[0];

  return rollbackToCheckpoint(latest.id, state);
}

/**
 * Prune old checkpoints beyond the keep limit
 */
function pruneOldCheckpoints(state: ForgeState): void {
  const keep = state.checkpoints.auto.keep;
  const items = state.checkpoints.items;

  if (items.length <= keep) return;

  // Sort by iteration (oldest first)
  items.sort((a, b) => a.iteration - b.iteration);

  // Remove oldest checkpoints
  while (items.length > keep) {
    const removed = items.shift();
    if (removed) {
      // Delete checkpoint file
      const checkpointFile = join(CHECKPOINTS_DIR, `${removed.id}.json`);
      if (existsSync(checkpointFile)) {
        unlinkSync(checkpointFile);
      }
    }
  }
}

/**
 * List all checkpoints for current task
 */
export function listCheckpoints(state: ForgeState): Checkpoint[] {
  return [...state.checkpoints.items].sort((a, b) => b.iteration - a.iteration);
}
