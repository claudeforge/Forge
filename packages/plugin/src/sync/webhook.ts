/**
 * Webhook client for Control Center communication
 */

import type { ForgeState } from "@claudeforge/forge-shared";
import type { ForgeEvent } from "@claudeforge/forge-shared";

/**
 * Send event to Control Center
 * Returns true if successful, false otherwise
 * Fails silently - Control Center is optional
 */
export async function sendWebhook(
  state: ForgeState,
  eventData: Partial<ForgeEvent>
): Promise<boolean> {
  const config = state.controlCenter;

  // Skip if not enabled or no URL
  if (!config.enabled || !config.url) {
    return false;
  }

  // Build full event
  const event: ForgeEvent = {
    ...eventData,
    projectId: config.projectId ?? "unknown",
    taskId: state.task.id,
    timestamp: new Date().toISOString(),
  } as ForgeEvent;

  try {
    const response = await fetch(`${config.url}/api/webhooks/forge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    return response.ok;
  } catch {
    // Silently fail - Control Center might not be running
    // This is expected behavior for local-only usage
    return false;
  }
}

/**
 * Check if Control Center is reachable
 */
export async function isControlCenterAvailable(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}
