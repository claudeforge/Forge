import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseTranscript, extractLastAssistantOutput, extractPromise } from "./transcript.js";

// Mock fs
vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";

const mockReadFileSync = vi.mocked(readFileSync);

describe("Transcript Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseTranscript", () => {
    it("should parse JSONL format correctly", () => {
      const jsonl = `{"type":"message","role":"user","message":{"content":[{"type":"text","text":"Hello"}]}}
{"type":"message","role":"assistant","message":{"content":[{"type":"text","text":"Hi there!"}]}}`;
      mockReadFileSync.mockReturnValue(jsonl);

      const result = parseTranscript("/path/to/transcript");

      expect(result).toHaveLength(2);
      expect(result[0]?.role).toBe("user");
      expect(result[1]?.role).toBe("assistant");
    });

    it("should skip empty lines", () => {
      const jsonl = `{"type":"message","role":"user"}

{"type":"message","role":"assistant"}`;
      mockReadFileSync.mockReturnValue(jsonl);

      const result = parseTranscript("/path/to/transcript");

      expect(result).toHaveLength(2);
    });

    it("should skip invalid JSON lines", () => {
      const jsonl = `{"type":"message","role":"user"}
not valid json
{"type":"message","role":"assistant"}`;
      mockReadFileSync.mockReturnValue(jsonl);

      const result = parseTranscript("/path/to/transcript");

      expect(result).toHaveLength(2);
    });

    it("should handle empty file", () => {
      mockReadFileSync.mockReturnValue("");

      const result = parseTranscript("/path/to/transcript");

      expect(result).toHaveLength(0);
    });
  });

  describe("extractLastAssistantOutput", () => {
    it("should extract text from last assistant message", () => {
      const messages = [
        { type: "message", role: "user", message: { content: [{ type: "text", text: "Hello" }] } },
        { type: "message", role: "assistant", message: { content: [{ type: "text", text: "First response" }] } },
        { type: "message", role: "user", message: { content: [{ type: "text", text: "Follow up" }] } },
        { type: "message", role: "assistant", message: { content: [{ type: "text", text: "Last response" }] } },
      ];

      const result = extractLastAssistantOutput(messages);

      expect(result).toBe("Last response");
    });

    it("should return null when no assistant messages", () => {
      const messages = [
        { type: "message", role: "user", message: { content: [{ type: "text", text: "Hello" }] } },
      ];

      const result = extractLastAssistantOutput(messages);

      expect(result).toBeNull();
    });

    it("should return null when messages array is empty", () => {
      const result = extractLastAssistantOutput([]);

      expect(result).toBeNull();
    });

    it("should join multiple text blocks", () => {
      const messages = [
        {
          type: "message",
          role: "assistant",
          message: {
            content: [
              { type: "text", text: "First block" },
              { type: "text", text: "Second block" },
            ],
          },
        },
      ];

      const result = extractLastAssistantOutput(messages);

      expect(result).toBe("First block\nSecond block");
    });

    it("should filter out non-text blocks", () => {
      const messages = [
        {
          type: "message",
          role: "assistant",
          message: {
            content: [
              { type: "tool_use", text: "should be ignored" },
              { type: "text", text: "Actual text" },
              { type: "image", text: "also ignored" },
            ],
          },
        },
      ];

      const result = extractLastAssistantOutput(messages);

      expect(result).toBe("Actual text");
    });

    it("should return null when content is missing", () => {
      const messages = [
        { type: "message", role: "assistant", message: {} },
      ];

      const result = extractLastAssistantOutput(messages as any);

      expect(result).toBeNull();
    });

    it("should return null when message is missing", () => {
      const messages = [
        { type: "message", role: "assistant" },
      ];

      const result = extractLastAssistantOutput(messages as any);

      expect(result).toBeNull();
    });
  });

  describe("extractPromise", () => {
    it("should extract promise text from output", () => {
      const output = `Some text before
<promise>Task completed successfully</promise>
Some text after`;

      const result = extractPromise(output);

      expect(result).toBe("Task completed successfully");
    });

    it("should return null when no promise tag", () => {
      const output = "Just regular text without promise tags";

      const result = extractPromise(output);

      expect(result).toBeNull();
    });

    it("should handle multiline promise content", () => {
      const output = `<promise>
First line
Second line
</promise>`;

      const result = extractPromise(output);

      expect(result).toBe("First line\nSecond line");
    });

    it("should extract first promise if multiple exist", () => {
      const output = `<promise>First</promise>
<promise>Second</promise>`;

      const result = extractPromise(output);

      expect(result).toBe("First");
    });

    it("should trim whitespace from promise content", () => {
      const output = "<promise>  trimmed content  </promise>";

      const result = extractPromise(output);

      expect(result).toBe("trimmed content");
    });

    it("should return empty string for empty promise", () => {
      const output = "<promise></promise>";

      const result = extractPromise(output);

      expect(result).toBe("");
    });
  });
});
