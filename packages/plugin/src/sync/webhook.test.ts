import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendWebhook, isControlCenterAvailable } from "./webhook.js";
import type { ForgeState } from "@claudeforge/forge-shared";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMinimalState(enabled: boolean = true, url: string | null = "http://localhost:3344"): ForgeState {
  return {
    version: "1.0.0",
    task: {
      id: "test-task",
      name: "Test Task",
      prompt: "Test prompt",
      startedAt: new Date().toISOString(),
      status: "running",
    },
    iteration: {
      current: 5,
      max: 30,
      currentStartedAt: new Date().toISOString(),
      history: [],
    },
    criteria: {
      mode: "all",
      requiredScore: 0.8,
      items: [],
    },
    budget: {
      maxDuration: null,
      maxTokens: null,
    },
    checkpoints: {
      auto: { enabled: true, interval: 10, keep: 5 },
      items: [],
    },
    stuckDetection: {
      enabled: true,
      sameOutputThreshold: 3,
      noProgressThreshold: 5,
      strategy: "retry-variation",
    },
    qualityGates: [],
    metrics: {
      totalTokens: 1000,
      totalDuration: 60000,
      filesCreated: [],
      filesModified: [],
    },
    controlCenter: {
      enabled,
      url,
      projectId: "project-123",
      taskId: "task-456",
    },
  };
}

describe("Webhook Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendWebhook", () => {
    it("should return false when control center is not enabled", async () => {
      const state = createMinimalState(false);

      const result = await sendWebhook(state, { type: "task:progress" });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return false when url is null", async () => {
      const state = createMinimalState(true, null);

      const result = await sendWebhook(state, { type: "task:progress" });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should send webhook to correct endpoint", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();

      await sendWebhook(state, { type: "task:completed" });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3344/api/webhooks/forge",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should include event data in request body", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();

      await sendWebhook(state, { type: "task:progress", iteration: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining("task:progress"),
        })
      );
    });

    it("should include projectId and taskId in event", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();

      await sendWebhook(state, { type: "task:completed" });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call?.[1]?.body);

      expect(body.projectId).toBe("project-123");
      expect(body.taskId).toBe("test-task");
      expect(body.timestamp).toBeDefined();
    });

    it("should return true on successful response", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();

      const result = await sendWebhook(state, { type: "task:completed" });

      expect(result).toBe(true);
    });

    it("should return false on failed response", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      const state = createMinimalState();

      const result = await sendWebhook(state, { type: "task:completed" });

      expect(result).toBe(false);
    });

    it("should return false and not throw on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      const state = createMinimalState();

      const result = await sendWebhook(state, { type: "task:completed" });

      expect(result).toBe(false);
    });

    it("should use 'unknown' for missing projectId", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();
      state.controlCenter.projectId = null;

      await sendWebhook(state, { type: "task:completed" });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call?.[1]?.body);

      expect(body.projectId).toBe("unknown");
    });
  });

  describe("isControlCenterAvailable", () => {
    it("should return true when health check succeeds", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await isControlCenterAvailable("http://localhost:3344");

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3344/health",
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should return false when health check fails", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 503 });

      const result = await isControlCenterAvailable("http://localhost:3344");

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await isControlCenterAvailable("http://localhost:3344");

      expect(result).toBe(false);
    });

    it("should use timeout signal", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await isControlCenterAvailable("http://localhost:3344");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });
});
