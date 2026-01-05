/**
 * Sync Client v2
 *
 * Plugin-side client for the v2 sync protocol.
 * Handles:
 * - Node registration
 * - Task locking with heartbeat
 * - Optimistic sync with conflict resolution
 * - Intervention commands
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type {
  TaskStatus,
  SyncHandshakeRequest,
  SyncHandshakeResponse,
  SyncPushRequest,
  SyncPushResponse,
  TaskClaimRequest,
  TaskClaimResponse,
  TaskHeartbeatRequest,
  TaskHeartbeatResponse,
  TaskLock,
  HeartbeatExecutionState,
} from "@claudeforge/forge-shared";
import { loadExecution, getExecutionSummary } from "./execution.js";

// ============================================
// TYPES
// ============================================

interface NodeIdentityFile {
  nodeId: string;
  createdAt: string;
  displayName?: string;
}

interface SyncClientConfig {
  controlUrl: string;
  projectId: string;
  projectPath: string;
}

interface SyncState {
  nodeId: string;
  localClock: number;
  taskVersions: Record<string, number>;
  currentLock: TaskLock | null;
  heartbeatInterval: NodeJS.Timeout | null;
}

// ============================================
// NODE IDENTITY
// ============================================

const NODE_IDENTITY_FILE = ".forge/node-identity.json";

function getNodeIdentityPath(projectPath: string): string {
  return join(projectPath, NODE_IDENTITY_FILE);
}

function loadOrCreateNodeIdentity(projectPath: string): NodeIdentityFile {
  const identityPath = getNodeIdentityPath(projectPath);

  if (existsSync(identityPath)) {
    try {
      return JSON.parse(readFileSync(identityPath, "utf-8"));
    } catch {
      // Corrupted, recreate
    }
  }

  const identity: NodeIdentityFile = {
    nodeId: `plugin-${randomUUID()}`,
    createdAt: new Date().toISOString(),
  };

  const dir = dirname(identityPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(identityPath, JSON.stringify(identity, null, 2));
  return identity;
}

// ============================================
// SYNC CLIENT
// ============================================

export class SyncClientV2 {
  private config: SyncClientConfig;
  private state: SyncState;

  constructor(config: SyncClientConfig) {
    this.config = config;

    const identity = loadOrCreateNodeIdentity(config.projectPath);

    this.state = {
      nodeId: identity.nodeId,
      localClock: 0,
      taskVersions: {},
      currentLock: null,
      heartbeatInterval: null,
    };
  }

  get nodeId(): string {
    return this.state.nodeId;
  }

  get currentLock(): TaskLock | null {
    return this.state.currentLock;
  }

  // ============================================
  // REGISTRATION
  // ============================================

  async register(displayName?: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.controlUrl}/api/v2/sync/nodes/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodeId: this.state.nodeId,
            projectId: this.config.projectId,
            nodeType: "plugin",
            displayName,
            capabilities: ["execute", "sync"],
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        console.error(`[SyncV2] Registration failed: ${response.status}`);
        return false;
      }

      const data = (await response.json()) as { serverClock: number };
      this.state.localClock = Math.max(this.state.localClock, data.serverClock);

      console.error(`[SyncV2] Registered as ${this.state.nodeId}`);
      return true;
    } catch (error) {
      console.error("[SyncV2] Registration error:", error);
      return false;
    }
  }

  // ============================================
  // HANDSHAKE
  // ============================================

  async handshake(): Promise<SyncHandshakeResponse | null> {
    try {
      const request: SyncHandshakeRequest = {
        nodeId: this.state.nodeId,
        localClock: this.state.localClock,
        taskVersions: this.state.taskVersions,
      };

      const response = await fetch(
        `${this.config.controlUrl}/api/v2/sync/handshake/${this.config.projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        console.error(`[SyncV2] Handshake failed: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as SyncHandshakeResponse;
      this.state.localClock = Math.max(this.state.localClock, data.serverClock);

      return data;
    } catch (error) {
      console.error("[SyncV2] Handshake error:", error);
      return null;
    }
  }

  // ============================================
  // TASK CLAIM (LOCK)
  // ============================================

  async claimTask(taskId: string): Promise<TaskClaimResponse> {
    try {
      const request: TaskClaimRequest = {
        nodeId: this.state.nodeId,
      };

      const response = await fetch(
        `${this.config.controlUrl}/api/v2/sync/tasks/${taskId}/claim`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(10000),
        }
      );

      const data = (await response.json()) as TaskClaimResponse;

      if (data.success && data.lock) {
        this.state.currentLock = data.lock;
        this.startHeartbeat(taskId);

        // Update local version tracking
        if (data.task) {
          this.state.taskVersions[taskId] =
            (this.state.taskVersions[taskId] ?? 0) + 1;
        }
      }

      return data;
    } catch (error) {
      console.error("[SyncV2] Claim error:", error);
      return {
        success: false,
        error: "TASK_NOT_FOUND",
      };
    }
  }

  // ============================================
  // HEARTBEAT
  // ============================================

  private startHeartbeat(taskId: string): void {
    // Clear any existing heartbeat
    this.stopHeartbeat();

    // Send heartbeat every 30 seconds
    this.state.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat(taskId, 0);
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.state.heartbeatInterval) {
      clearInterval(this.state.heartbeatInterval);
      this.state.heartbeatInterval = null;
    }
  }

  async sendHeartbeat(
    taskId: string,
    iteration: number,
    progress?: number
  ): Promise<TaskHeartbeatResponse> {
    try {
      // Build execution state from local file
      const executionState = this.buildExecutionState(taskId);

      const request: TaskHeartbeatRequest = {
        nodeId: this.state.nodeId,
        iteration,
        progress,
        executionState,
      };

      const response = await fetch(
        `${this.config.controlUrl}/api/v2/sync/tasks/${taskId}/heartbeat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(5000),
        }
      );

      const data = (await response.json()) as TaskHeartbeatResponse;

      if (!data.success) {
        // Lock lost!
        this.state.currentLock = null;
        this.stopHeartbeat();
        console.error("[SyncV2] Lock lost during heartbeat");
      } else if (data.expiresAt && this.state.currentLock) {
        this.state.currentLock.expiresAt = data.expiresAt;
        this.state.currentLock.heartbeatAt = new Date().toISOString();
      }

      // Handle commands from server
      if (data.commands && data.commands.length > 0) {
        for (const cmd of data.commands) {
          console.error(`[SyncV2] Server command: ${cmd.type} - ${cmd.reason}`);
        }
      }

      return data;
    } catch (error) {
      console.error("[SyncV2] Heartbeat error:", error);
      return {
        success: false,
        error: "LOCK_LOST",
      };
    }
  }

  /**
   * Build execution state from local execution file for heartbeat
   */
  private buildExecutionState(taskId: string): HeartbeatExecutionState | undefined {
    try {
      const execution = loadExecution();
      const task = execution.queue.find(t => t.id === taskId);

      if (!task) return undefined;

      const summary = getExecutionSummary();

      return {
        status: execution.current.isPaused ? "paused" : "running",
        iteration: task.iteration ?? 1,
        maxIterations: task.maxIterations ?? 10,
        startedAt: task.startedAt ?? new Date().toISOString(),
        criteriaResults: task.result?.criteriaResults,
        queueSummary: {
          total: summary.total,
          queued: summary.queued,
          completed: summary.completed,
          failed: summary.failed,
        },
      };
    } catch {
      // If execution file can't be read, skip execution state
      return undefined;
    }
  }

  // ============================================
  // PUSH STATUS UPDATE
  // ============================================

  async pushStatus(
    taskId: string,
    status: TaskStatus,
    result?: unknown
  ): Promise<SyncPushResponse> {
    const expectedVersion = this.state.taskVersions[taskId] ?? 1;

    try {
      const request: SyncPushRequest = {
        nodeId: this.state.nodeId,
        tasks: [
          {
            id: taskId,
            status,
            expectedVersion,
            result,
          },
        ],
      };

      const response = await fetch(
        `${this.config.controlUrl}/api/v2/sync/push/${this.config.projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(10000),
        }
      );

      const data = (await response.json()) as SyncPushResponse;
      this.state.localClock = Math.max(this.state.localClock, data.serverClock);

      // Update local versions
      for (const result of data.results) {
        if (result.success && result.newVersion) {
          this.state.taskVersions[result.taskId] = result.newVersion;
        } else if (result.serverState) {
          // Sync our version with server
          this.state.taskVersions[result.taskId] = result.serverState.version;
        }
      }

      // Stop heartbeat if task is complete
      const taskResult = data.results.find((r) => r.taskId === taskId);
      if (
        taskResult?.success &&
        ["completed", "failed", "aborted"].includes(status)
      ) {
        this.releaseTask(taskId);
      }

      return data;
    } catch (error) {
      console.error("[SyncV2] Push error:", error);
      return {
        results: [
          {
            taskId,
            success: false,
            error: "VERSION_CONFLICT",
          },
        ],
        serverClock: this.state.localClock,
      };
    }
  }

  // ============================================
  // RELEASE LOCK
  // ============================================

  async releaseTask(taskId: string): Promise<boolean> {
    this.stopHeartbeat();
    this.state.currentLock = null;

    try {
      const response = await fetch(
        `${this.config.controlUrl}/api/v2/sync/tasks/${taskId}/release`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId: this.state.nodeId }),
          signal: AbortSignal.timeout(5000),
        }
      );

      return response.ok;
    } catch (error) {
      console.error("[SyncV2] Release error:", error);
      return false;
    }
  }

  // ============================================
  // FULL SYNC
  // ============================================

  async fullSync(): Promise<{
    pulled: number;
    pushed: number;
    conflicts: number;
  }> {
    const result = { pulled: 0, pushed: 0, conflicts: 0 };

    // 1. Handshake
    const handshake = await this.handshake();
    if (!handshake) {
      return result;
    }

    result.conflicts = handshake.conflicts.length;

    // 2. Pull updates from server
    if (handshake.needsPull.length > 0) {
      try {
        const response = await fetch(
          `${this.config.controlUrl}/api/v2/sync/pull/${this.config.projectId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nodeId: this.state.nodeId,
              taskIds: handshake.needsPull,
            }),
            signal: AbortSignal.timeout(10000),
          }
        );

        if (response.ok) {
          const data = (await response.json()) as {
            tasks: Array<{ id: string; version: number }>;
          };
          for (const task of data.tasks) {
            this.state.taskVersions[task.id] = task.version;
          }
          result.pulled = data.tasks.length;
        }
      } catch (error) {
        console.error("[SyncV2] Pull error:", error);
      }
    }

    // Note: Push is handled separately when status changes

    return result;
  }

  // ============================================
  // CLEANUP
  // ============================================

  destroy(): void {
    this.stopHeartbeat();
  }
}

// ============================================
// FACTORY
// ============================================

let clientInstance: SyncClientV2 | null = null;

export function getSyncClient(config: SyncClientConfig): SyncClientV2 {
  if (!clientInstance) {
    clientInstance = new SyncClientV2(config);
  }
  return clientInstance;
}

export function destroySyncClient(): void {
  if (clientInstance) {
    clientInstance.destroy();
    clientInstance = null;
  }
}
