/**
 * Tests for Sync Client V2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SyncClientV2, getSyncClient, destroySyncClient } from "./sync-client-v2.js";

// Mock fs
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock crypto
vi.mock("node:crypto", () => ({
  randomUUID: vi.fn(() => "test-uuid-1234"),
}));

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SyncClientV2", () => {
  const defaultConfig = {
    controlUrl: "http://localhost:3344",
    projectId: "proj-1",
    projectPath: "/test/project",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    destroySyncClient();

    // Default: no existing identity file
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    destroySyncClient();
  });

  describe("constructor", () => {
    it("should create new identity when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const client = new SyncClientV2(defaultConfig);

      expect(client.nodeId).toBe("plugin-test-uuid-1234");
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should load existing identity when file exists", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          nodeId: "plugin-existing-id",
          createdAt: "2024-01-01T00:00:00.000Z",
        })
      );

      const client = new SyncClientV2(defaultConfig);

      expect(client.nodeId).toBe("plugin-existing-id");
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("should recreate identity when file is corrupted", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Parse error");
      });

      const client = new SyncClientV2(defaultConfig);

      expect(client.nodeId).toBe("plugin-test-uuid-1234");
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should create directory if it does not exist", () => {
      mockExistsSync.mockImplementation((path) => {
        if (typeof path === "string" && path.includes("node-identity")) {
          return false;
        }
        if (typeof path === "string" && path.includes(".forge")) {
          return false;
        }
        return false;
      });

      new SyncClientV2(defaultConfig);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(".forge"),
        { recursive: true }
      );
    });

    it("should have null currentLock initially", () => {
      const client = new SyncClientV2(defaultConfig);

      expect(client.currentLock).toBeNull();
    });
  });

  describe("register", () => {
    it("should register successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ serverClock: 5 }),
      });

      const client = new SyncClientV2(defaultConfig);
      const result = await client.register("Test Node");

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3344/api/v2/sync/nodes/register",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("plugin-test-uuid-1234"),
        })
      );
    });

    it("should return false on registration failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.register();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[SyncV2] Registration failed: 500"
      );
      consoleSpy.mockRestore();
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.register();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[SyncV2] Registration error:",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("handshake", () => {
    it("should perform handshake successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          serverClock: 10,
          needsPull: ["task-1"],
          needsPush: [],
          conflicts: [],
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      const result = await client.handshake();

      expect(result).not.toBeNull();
      expect(result?.serverClock).toBe(10);
      expect(result?.needsPull).toEqual(["task-1"]);
    });

    it("should return null on handshake failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.handshake();

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it("should return null on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.handshake();

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe("claimTask", () => {
    it("should claim task successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          lock: {
            taskId: "task-1",
            nodeId: "plugin-test-uuid-1234",
            expiresAt: "2024-01-01T01:00:00.000Z",
            heartbeatAt: "2024-01-01T00:00:00.000Z",
          },
          task: {
            id: "task-1",
            status: "running",
          },
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      const result = await client.claimTask("task-1");

      expect(result.success).toBe(true);
      expect(result.lock).toBeDefined();
      expect(client.currentLock).not.toBeNull();
    });

    it("should return failure when task is already locked", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "ALREADY_LOCKED",
          lockedBy: "other-node",
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      const result = await client.claimTask("task-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("ALREADY_LOCKED");
      expect(client.currentLock).toBeNull();
    });

    it("should return failure on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.claimTask("task-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("TASK_NOT_FOUND");
      consoleSpy.mockRestore();
    });
  });

  describe("sendHeartbeat", () => {
    it("should send heartbeat successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          expiresAt: "2024-01-01T01:00:00.000Z",
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      // Manually set a lock for testing
      (client as any).state.currentLock = {
        taskId: "task-1",
        nodeId: "plugin-test-uuid-1234",
        expiresAt: "2024-01-01T00:30:00.000Z",
        heartbeatAt: "2024-01-01T00:00:00.000Z",
      };

      const result = await client.sendHeartbeat("task-1", 5, 50);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3344/api/v2/sync/tasks/task-1/heartbeat",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"iteration":5'),
        })
      );
    });

    it("should handle lost lock", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: "LOCK_LOST",
        }),
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      (client as any).state.currentLock = {
        taskId: "task-1",
        nodeId: "plugin-test-uuid-1234",
        expiresAt: "2024-01-01T00:30:00.000Z",
        heartbeatAt: "2024-01-01T00:00:00.000Z",
      };

      const result = await client.sendHeartbeat("task-1", 0);

      expect(result.success).toBe(false);
      expect(client.currentLock).toBeNull();
      consoleSpy.mockRestore();
    });

    it("should handle server commands", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          commands: [
            { type: "PAUSE", reason: "User requested pause" },
          ],
        }),
      });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.sendHeartbeat("task-1", 0);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "[SyncV2] Server command: PAUSE - User requested pause"
      );
      consoleSpy.mockRestore();
    });

    it("should return failure on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.sendHeartbeat("task-1", 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe("LOCK_LOST");
      consoleSpy.mockRestore();
    });
  });

  describe("pushStatus", () => {
    it("should push status successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { taskId: "task-1", success: true, newVersion: 2 },
          ],
          serverClock: 15,
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      const result = await client.pushStatus("task-1", "completed", { output: "done" });

      expect(result.results[0]?.success).toBe(true);
      expect(result.serverClock).toBe(15);
    });

    it("should handle version conflict", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              taskId: "task-1",
              success: false,
              error: "VERSION_CONFLICT",
              serverState: { version: 5 },
            },
          ],
          serverClock: 15,
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      const result = await client.pushStatus("task-1", "running");

      expect(result.results[0]?.success).toBe(false);
    });

    it("should release task on terminal status", async () => {
      // First claim the task
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          lock: {
            taskId: "task-1",
            nodeId: "plugin-test-uuid-1234",
            expiresAt: "2024-01-01T01:00:00.000Z",
            heartbeatAt: "2024-01-01T00:00:00.000Z",
          },
        }),
      });
      const client = new SyncClientV2(defaultConfig);
      await client.claimTask("task-1");

      // Then push completed status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ taskId: "task-1", success: true, newVersion: 2 }],
          serverClock: 15,
        }),
      });
      mockFetch.mockResolvedValueOnce({ ok: true }); // Release call

      await client.pushStatus("task-1", "completed");

      expect(client.currentLock).toBeNull();
    });

    it("should return error response on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.pushStatus("task-1", "running");

      expect(result.results[0]?.success).toBe(false);
      expect(result.results[0]?.error).toBe("VERSION_CONFLICT");
      consoleSpy.mockRestore();
    });
  });

  describe("releaseTask", () => {
    it("should release task successfully", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const client = new SyncClientV2(defaultConfig);
      (client as any).state.currentLock = {
        taskId: "task-1",
        nodeId: "plugin-test-uuid-1234",
        expiresAt: "2024-01-01T00:30:00.000Z",
        heartbeatAt: "2024-01-01T00:00:00.000Z",
      };

      const result = await client.releaseTask("task-1");

      expect(result).toBe(true);
      expect(client.currentLock).toBeNull();
    });

    it("should return false on release failure", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const client = new SyncClientV2(defaultConfig);
      const result = await client.releaseTask("task-1");

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.releaseTask("task-1");

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe("fullSync", () => {
    it("should perform full sync successfully", async () => {
      // Handshake
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          serverClock: 10,
          needsPull: ["task-1", "task-2"],
          needsPush: [],
          conflicts: [{ taskId: "task-3" }],
        }),
      });
      // Pull
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          tasks: [
            { id: "task-1", version: 3 },
            { id: "task-2", version: 2 },
          ],
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      const result = await client.fullSync();

      expect(result.pulled).toBe(2);
      expect(result.conflicts).toBe(1);
    });

    it("should handle handshake failure", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.fullSync();

      expect(result.pulled).toBe(0);
      expect(result.pushed).toBe(0);
      expect(result.conflicts).toBe(0);
      consoleSpy.mockRestore();
    });

    it("should handle pull failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          serverClock: 10,
          needsPull: ["task-1"],
          needsPush: [],
          conflicts: [],
        }),
      });
      mockFetch.mockRejectedValueOnce(new Error("Pull error"));
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const client = new SyncClientV2(defaultConfig);
      const result = await client.fullSync();

      expect(result.pulled).toBe(0);
      consoleSpy.mockRestore();
    });

    it("should skip pull when nothing to pull", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          serverClock: 10,
          needsPull: [],
          needsPush: [],
          conflicts: [],
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      const result = await client.fullSync();

      expect(result.pulled).toBe(0);
      // Only handshake call, no pull
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("heartbeat interval", () => {
    it("should start and stop heartbeat on claim/release", async () => {
      // Claim task
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          lock: {
            taskId: "task-1",
            nodeId: "plugin-test-uuid-1234",
            expiresAt: "2024-01-01T01:00:00.000Z",
            heartbeatAt: "2024-01-01T00:00:00.000Z",
          },
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      await client.claimTask("task-1");

      // Heartbeat interval should be set
      expect((client as any).state.heartbeatInterval).not.toBeNull();

      // Release task
      mockFetch.mockResolvedValueOnce({ ok: true });
      await client.releaseTask("task-1");

      // Heartbeat interval should be cleared
      expect((client as any).state.heartbeatInterval).toBeNull();
    });

    it("should send heartbeat on interval", async () => {
      // Claim task
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          lock: {
            taskId: "task-1",
            nodeId: "plugin-test-uuid-1234",
            expiresAt: "2024-01-01T01:00:00.000Z",
            heartbeatAt: "2024-01-01T00:00:00.000Z",
          },
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      await client.claimTask("task-1");

      // Setup heartbeat response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Advance time by 30 seconds
      await vi.advanceTimersByTimeAsync(30000);

      // Heartbeat should have been sent
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3344/api/v2/sync/tasks/task-1/heartbeat",
        expect.any(Object)
      );

      // Cleanup
      mockFetch.mockResolvedValueOnce({ ok: true });
      await client.releaseTask("task-1");
    });
  });

  describe("destroy", () => {
    it("should stop heartbeat on destroy", async () => {
      // Claim task to start heartbeat
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          lock: {
            taskId: "task-1",
            nodeId: "plugin-test-uuid-1234",
            expiresAt: "2024-01-01T01:00:00.000Z",
            heartbeatAt: "2024-01-01T00:00:00.000Z",
          },
        }),
      });

      const client = new SyncClientV2(defaultConfig);
      await client.claimTask("task-1");

      expect((client as any).state.heartbeatInterval).not.toBeNull();

      client.destroy();

      expect((client as any).state.heartbeatInterval).toBeNull();
    });
  });

  describe("getSyncClient / destroySyncClient", () => {
    it("should return singleton instance", () => {
      const client1 = getSyncClient(defaultConfig);
      const client2 = getSyncClient(defaultConfig);

      expect(client1).toBe(client2);
    });

    it("should destroy singleton instance", () => {
      const client = getSyncClient(defaultConfig);
      destroySyncClient();

      const newClient = getSyncClient(defaultConfig);
      expect(newClient).not.toBe(client);
    });

    it("should handle destroy when no client exists", () => {
      // Should not throw
      expect(() => destroySyncClient()).not.toThrow();
    });
  });
});
