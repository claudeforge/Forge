/**
 * External Command Types
 * Control Center tarafından .claude/forge-command.json'a yazılır
 */

export interface PauseCommand {
  command: "pause";
  timestamp: string;
}

export interface ResumeCommand {
  command: "resume";
  timestamp: string;
}

export interface AbortCommand {
  command: "abort";
  timestamp: string;
  reason?: string;
}

export interface CheckpointCommand {
  command: "checkpoint";
  timestamp: string;
  name?: string;
}

export interface RollbackCommand {
  command: "rollback";
  timestamp: string;
  checkpointId: string;
}

/** Tüm command'ların union'u */
export type ForgeCommand =
  | PauseCommand
  | ResumeCommand
  | AbortCommand
  | CheckpointCommand
  | RollbackCommand;
