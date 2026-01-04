/**
 * Iteration summary generation
 * Creates a brief summary of what happened in an iteration
 */

/**
 * Generate a brief summary from Claude's output
 * Uses simple heuristics to extract key info
 */
export async function generateIterationSummary(output: string): Promise<string> {
  const lines = output.split("\n").filter((l) => l.trim());

  // Look for action indicators in first 10 lines
  for (const line of lines.slice(0, 10)) {
    const lower = line.toLowerCase();

    // Skip common noise
    if (
      lower.startsWith("i ") ||
      lower.startsWith("let me") ||
      lower.startsWith("i'll")
    ) {
      continue;
    }

    // Look for action keywords
    const actionKeywords = [
      "created",
      "added",
      "fixed",
      "implemented",
      "updated",
      "refactored",
      "removed",
      "deleted",
      "modified",
      "wrote",
      "built",
      "configured",
      "installed",
      "set up",
      "completed",
    ];

    if (actionKeywords.some((kw) => lower.includes(kw))) {
      // Clean and truncate
      const clean = line.replace(/^[\s\-\*•>]+/, "").trim();
      return clean.slice(0, 100) + (clean.length > 100 ? "..." : "");
    }
  }

  // Fallback: first non-empty line truncated
  const first = lines[0] ?? "No output";
  const clean = first.replace(/^[\s\-\*•>]+/, "").trim();
  return clean.slice(0, 100) + (clean.length > 100 ? "..." : "");
}
