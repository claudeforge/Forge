/**
 * Transcript parsing utilities
 * Parses Claude Code's JSONL transcript format
 */

import { readFileSync } from "node:fs";

interface ContentBlock {
  type: string;
  text?: string;
}

interface TranscriptMessage {
  type: string;
  role?: string;
  message?: {
    content: ContentBlock[];
  };
}

/**
 * Parse a transcript file (JSONL format)
 */
export function parseTranscript(path: string): TranscriptMessage[] {
  const content = readFileSync(path, "utf-8");
  const lines = content.trim().split("\n");

  const messages: TranscriptMessage[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line) as TranscriptMessage;
      messages.push(msg);
    } catch {
      // Skip invalid JSON lines
    }
  }

  return messages;
}

/**
 * Extract the last assistant message text from transcript
 */
export function extractLastAssistantOutput(
  messages: TranscriptMessage[]
): string | null {
  // Find all assistant messages
  const assistantMessages = messages.filter(
    (m) => m.role === "assistant" && m.message?.content
  );

  if (assistantMessages.length === 0) return null;

  const last = assistantMessages[assistantMessages.length - 1];
  if (!last.message?.content) return null;

  // Extract text from content blocks
  const textBlocks = last.message.content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text!);

  return textBlocks.join("\n");
}

/**
 * Extract promise text from output
 * Looks for <promise>TEXT</promise> pattern
 */
export function extractPromise(output: string): string | null {
  const match = output.match(/<promise>([\s\S]*?)<\/promise>/);
  return match ? match[1].trim() : null;
}
