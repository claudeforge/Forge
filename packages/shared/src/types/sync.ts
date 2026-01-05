/**
 * Sync Types
 *
 * Defines the sync protocol between plugins and Control Center.
 * Uses monotonic versioning + logical clocks for conflict-free sync.
 */

// ============================================
// TASK STATUS & STATE MACHINE
// ============================================

export type TaskStatus =
  | "queued"
  | "running"
  | "paused"
  | "stuck"
  | "completed"
  | "failed"
  | "aborted";

/**
 * Valid state transitions for tasks
 * Any transition not in this map is invalid and will be rejected
 */
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  queued: ["running", "aborted"],
  running: ["completed", "failed", "paused", "aborted", "stuck"],
  paused: ["running", "completed", "failed", "aborted"],
  stuck: ["failed", "aborted", "running"],
  completed: [], // Terminal
  failed: ["queued", "aborted"], // Can retry
  aborted: [], // Terminal
};

/**
 * Status ordering for conflict resolution
 * Higher number = more "final" state
 */
export const STATUS_ORDER: Record<TaskStatus, number> = {
  queued: 0,
  running: 1,
  paused: 2,
  stuck: 3,
  completed: 4,
  failed: 4,
  aborted: 5,
};

/**
 * Terminal states that cannot be changed
 */
export const TERMINAL_STATES: TaskStatus[] = ["completed", "aborted"];

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a status is terminal (cannot be changed)
 */
export function isTerminalState(status: TaskStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

// ============================================
// SYNC METADATA
// ============================================

export interface SyncMetadata {
  /** Monotonically increasing version number */
  version: number;

  /** Logical clock (Lamport timestamp) for causality */
  logicalClock: number;

  /** Who last modified this entity */
  lastWriter: {
    nodeId: string;
    nodeType: "plugin" | "server";
  };

  /** Physical timestamp (for display/debugging) */
  physicalTime: string;

  /** SHA-256 hash of content for integrity verification */
  contentHash: string;
}

/**
 * Create initial sync metadata
 */
export function createSyncMetadata(
  nodeId: string,
  nodeType: "plugin" | "server",
  contentHash: string
): SyncMetadata {
  return {
    version: 1,
    logicalClock: 1,
    lastWriter: { nodeId, nodeType },
    physicalTime: new Date().toISOString(),
    contentHash,
  };
}

/**
 * Increment sync metadata for a new write
 */
export function incrementSyncMetadata(
  current: SyncMetadata,
  nodeId: string,
  nodeType: "plugin" | "server",
  newContentHash: string,
  remoteLogicalClock?: number
): SyncMetadata {
  // Lamport clock: max(local, remote) + 1
  const newLogicalClock = Math.max(
    current.logicalClock,
    remoteLogicalClock ?? 0
  ) + 1;

  return {
    version: current.version + 1,
    logicalClock: newLogicalClock,
    lastWriter: { nodeId, nodeType },
    physicalTime: new Date().toISOString(),
    contentHash: newContentHash,
  };
}

// ============================================
// NODE IDENTITY
// ============================================

export interface NodeIdentity {
  /** Unique node identifier (UUID) */
  nodeId: string;

  /** Type of node */
  nodeType: "plugin" | "server";

  /** Associated project ID */
  projectId: string;

  /** When this node was first registered */
  registeredAt: string;

  /** Last activity timestamp */
  lastSeen: string;

  /** Node capabilities */
  capabilities: ("execute" | "sync" | "monitor")[];

  /** Human-readable name (optional) */
  displayName?: string;
}

// ============================================
// TASK LOCKING
// ============================================

export interface TaskLock {
  /** Task being locked */
  taskId: string;

  /** Node holding the lock */
  lockedBy: string;

  /** When lock was acquired */
  lockedAt: string;

  /** When lock expires (auto-release) */
  expiresAt: string;

  /** Last heartbeat received */
  heartbeatAt: string;

  /** Current iteration (from heartbeat) */
  iteration?: number;

  /** Progress percentage 0-1 (from heartbeat) */
  progress?: number;
}

/** Default lock duration in ms (5 minutes) */
export const DEFAULT_LOCK_DURATION_MS = 5 * 60 * 1000;

/** Lock renewal threshold - renew when less than this time remaining */
export const LOCK_RENEWAL_THRESHOLD_MS = 60 * 1000;

/**
 * Check if a lock is expired
 */
export function isLockExpired(lock: TaskLock): boolean {
  return new Date(lock.expiresAt).getTime() < Date.now();
}

/**
 * Check if a lock should be renewed
 */
export function shouldRenewLock(lock: TaskLock): boolean {
  const remaining = new Date(lock.expiresAt).getTime() - Date.now();
  return remaining < LOCK_RENEWAL_THRESHOLD_MS;
}

// ============================================
// SYNC PROTOCOL
// ============================================

/**
 * Sync handshake request from plugin to server
 */
export interface SyncHandshakeRequest {
  /** Plugin's node ID */
  nodeId: string;

  /** Plugin's current logical clock */
  localClock: number;

  /** Version numbers for each task the plugin knows about */
  taskVersions: Record<string, number>;

  /** Plugin capabilities */
  capabilities?: ("execute" | "sync" | "monitor")[];
}

/**
 * Sync handshake response from server
 */
export interface SyncHandshakeResponse {
  /** Server's current logical clock */
  serverClock: number;

  /** Tasks with version conflicts */
  conflicts: Array<{
    taskId: string;
    localVersion: number;
    serverVersion: number;
  }>;

  /** Task IDs where server is ahead (plugin needs to pull) */
  needsPull: string[];

  /** Task IDs where plugin is ahead (plugin should push) */
  needsPush: string[];

  /** Task IDs that are already in sync */
  inSync: string[];

  /** Server timestamp for reference */
  serverTime: string;
}

/**
 * Request to push task updates to server
 */
export interface SyncPushRequest {
  /** Plugin's node ID */
  nodeId: string;

  /** Tasks to push */
  tasks: Array<{
    id: string;
    status: TaskStatus;
    expectedVersion: number;
    result?: unknown;
    iteration?: number;
  }>;
}

/**
 * Response from push request
 */
export interface SyncPushResponse {
  /** Results for each pushed task */
  results: Array<{
    taskId: string;
    success: boolean;
    newVersion?: number;
    error?: SyncError;
    resolution?: ConflictResolution;
    serverState?: {
      status: TaskStatus;
      version: number;
    };
  }>;

  /** Updated server logical clock */
  serverClock: number;
}

/**
 * Request to pull task updates from server
 */
export interface SyncPullRequest {
  /** Plugin's node ID */
  nodeId: string;

  /** Task IDs to pull */
  taskIds: string[];
}

/**
 * Response from pull request
 */
export interface SyncPullResponse {
  /** Full task data for each requested task */
  tasks: Array<{
    id: string;
    status: TaskStatus;
    version: number;
    result?: unknown;
    iteration?: number;
    lockedBy?: string;
  }>;

  /** Updated server logical clock */
  serverClock: number;
}

// ============================================
// CONFLICT RESOLUTION
// ============================================

export type SyncError =
  | "VERSION_CONFLICT"
  | "INVALID_TRANSITION"
  | "TASK_LOCKED"
  | "TASK_NOT_FOUND"
  | "TERMINAL_STATE"
  | "UNAUTHORIZED";

export type ConflictResolution =
  | "SERVER_WINS"
  | "PLUGIN_WINS"
  | "MERGE"
  | "REJECT"
  | "MANUAL";

export interface ConflictContext {
  /** Is this plugin the active runner for this task? */
  pluginIsActiveRunner: boolean;

  /** Server's current task state */
  serverState: {
    status: TaskStatus;
    version: number;
    lockedBy?: string;
  };

  /** Plugin's proposed state */
  pluginState: {
    status: TaskStatus;
    expectedVersion: number;
  };
}

/**
 * Resolve a sync conflict
 */
export function resolveConflict(context: ConflictContext): ConflictResolution {
  const { serverState, pluginState, pluginIsActiveRunner } = context;

  // Rule 1: Terminal states are immutable
  if (isTerminalState(serverState.status)) {
    return "SERVER_WINS";
  }

  // Rule 2: Invalid transition = reject
  if (!isValidTransition(serverState.status, pluginState.status)) {
    return "REJECT";
  }

  // Rule 3: Active runner's completion states always win
  if (
    pluginIsActiveRunner &&
    ["completed", "failed", "stuck"].includes(pluginState.status)
  ) {
    return "PLUGIN_WINS";
  }

  // Rule 4: Active runner's running state wins
  if (pluginIsActiveRunner && pluginState.status === "running") {
    return "PLUGIN_WINS";
  }

  // Rule 5: Higher (more final) state wins
  const serverOrder = STATUS_ORDER[serverState.status];
  const pluginOrder = STATUS_ORDER[pluginState.status];

  if (pluginOrder > serverOrder) {
    return "PLUGIN_WINS";
  }

  // Rule 6: Server wins by default
  return "SERVER_WINS";
}

// ============================================
// TASK CLAIM
// ============================================

export interface TaskClaimRequest {
  /** Plugin's node ID */
  nodeId: string;

  /** Requested lock duration in ms */
  lockDuration?: number;
}

export interface TaskClaimResponse {
  /** Whether claim was successful */
  success: boolean;

  /** Lock details if successful */
  lock?: TaskLock;

  /** Full task data if successful */
  task?: {
    id: string;
    name: string;
    prompt: string;
    status: TaskStatus;
    priority: number;
    config: unknown;
  };

  /** Error if not successful */
  error?: "ALREADY_LOCKED" | "TASK_NOT_FOUND" | "INVALID_STATUS";

  /** Who currently holds the lock (if locked) */
  lockedBy?: string;

  /** When current lock expires (if locked) */
  lockedUntil?: string;
}

// ============================================
// HEARTBEAT
// ============================================

export interface TaskHeartbeatRequest {
  /** Plugin's node ID */
  nodeId: string;

  /** Current iteration */
  iteration: number;

  /** Progress percentage 0-1 */
  progress?: number;

  /** Optional status message */
  message?: string;

  /** Extend lock duration (ms) */
  extendLock?: number;
}

export interface TaskHeartbeatResponse {
  /** Whether heartbeat was accepted */
  success: boolean;

  /** New lock expiry time */
  expiresAt?: string;

  /** Server commands for the plugin */
  commands?: Array<{
    type: "PAUSE" | "ABORT" | "CONTINUE";
    reason?: string;
  }>;

  /** Error if not successful */
  error?: "LOCK_LOST" | "TASK_NOT_FOUND";
}

// ============================================
// MONITORING (for Control Center)
// ============================================

export interface SyncStatus {
  /** Project ID */
  projectId: string;

  /** Connected nodes */
  nodes: Array<{
    nodeId: string;
    nodeType: "plugin" | "server";
    lastSeen: string;
    isOnline: boolean;
  }>;

  /** Active locks */
  activeLocks: TaskLock[];

  /** Pending sync operations */
  pendingSyncs: number;

  /** Last successful sync */
  lastSync: string;

  /** Sync health */
  health: "healthy" | "degraded" | "offline";
}

export interface TaskMonitoringInfo {
  /** Task ID */
  taskId: string;

  /** Current status */
  status: TaskStatus;

  /** Current version */
  version: number;

  /** Active lock if any */
  lock?: TaskLock;

  /** Is task stuck? */
  isStuck: boolean;

  /** Time since last activity */
  idleTime: number;

  /** History of recent status changes */
  history: Array<{
    status: TaskStatus;
    timestamp: string;
    changedBy: string;
  }>;
}

// ============================================
// CONTROL CENTER INTERVENTION
// ============================================

export type InterventionType =
  | "FORCE_STATUS"     // Force task to specific status
  | "RELEASE_LOCK"     // Force release a lock
  | "REASSIGN"         // Reassign to different node
  | "ABORT"            // Send abort command
  | "PAUSE"            // Send pause command
  | "RESUME"           // Send resume command
  | "RETRY";           // Retry failed task

export interface InterventionRequest {
  /** Type of intervention */
  type: InterventionType;

  /** Target task ID */
  taskId: string;

  /** Who is requesting (user/admin ID) */
  requestedBy: string;

  /** Reason for intervention */
  reason: string;

  /** Additional parameters based on type */
  params?: {
    /** For FORCE_STATUS */
    newStatus?: TaskStatus;

    /** For REASSIGN */
    newNodeId?: string;

    /** For RETRY */
    resetIteration?: boolean;
  };
}

export interface InterventionResponse {
  /** Whether intervention was successful */
  success: boolean;

  /** What action was taken */
  action: string;

  /** Error if any */
  error?: string;

  /** New task state after intervention */
  newState?: {
    status: TaskStatus;
    version: number;
    lockedBy?: string;
  };
}
