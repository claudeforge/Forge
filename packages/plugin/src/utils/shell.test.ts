import { describe, it, expect, vi, beforeEach } from "vitest";
import { execFile, git, npm, commandExists } from "./shell.js";

// We need to mock child_process for controlled testing
vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from "node:child_process";

const mockExecFileSync = vi.mocked(execFileSync);

describe("Shell Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execFile", () => {
    it("should return success result on successful execution", () => {
      mockExecFileSync.mockReturnValue("Hello World");

      const result = execFile("echo", ["Hello", "World"]);

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("Hello World");
      expect(result.stderr).toBe("");
    });

    it("should return failure result on error", () => {
      const error = new Error("Command failed") as Error & {
        status: number;
        stdout: Buffer;
        stderr: Buffer;
      };
      error.status = 1;
      error.stdout = Buffer.from("partial output");
      error.stderr = Buffer.from("error message");
      mockExecFileSync.mockImplementation(() => {
        throw error;
      });

      const result = execFile("failing-command", []);

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe("partial output");
      expect(result.stderr).toBe("error message");
    });

    it("should use default exit code 1 when status is undefined", () => {
      const error = new Error("Command failed");
      mockExecFileSync.mockImplementation(() => {
        throw error;
      });

      const result = execFile("failing-command", []);

      expect(result.exitCode).toBe(1);
    });

    it("should pass options to execFileSync", () => {
      mockExecFileSync.mockReturnValue("output");

      execFile("command", ["arg"], { cwd: "/some/path" });

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "command",
        ["arg"],
        expect.objectContaining({
          cwd: "/some/path",
          encoding: "utf-8",
          shell: false,
        })
      );
    });

    it("should have default timeout of 60 seconds", () => {
      mockExecFileSync.mockReturnValue("output");

      execFile("command", []);

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "command",
        [],
        expect.objectContaining({
          timeout: 60000,
        })
      );
    });

    it("should not use shell for security", () => {
      mockExecFileSync.mockReturnValue("output");

      execFile("command", []);

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "command",
        [],
        expect.objectContaining({
          shell: false,
        })
      );
    });
  });

  describe("git", () => {
    it("should call execFile with git command", () => {
      mockExecFileSync.mockReturnValue("output");

      const result = git(["status"]);

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        ["status"],
        expect.anything()
      );
      expect(result.success).toBe(true);
    });

    it("should pass options to execFile", () => {
      mockExecFileSync.mockReturnValue("output");

      git(["log"], { cwd: "/repo" });

      expect(mockExecFileSync).toHaveBeenCalledWith(
        "git",
        ["log"],
        expect.objectContaining({
          cwd: "/repo",
        })
      );
    });
  });

  describe("npm", () => {
    it("should call execFile with npm command", () => {
      mockExecFileSync.mockReturnValue("output");

      const result = npm(["install"]);

      // On Windows it should be npm.cmd, on Unix just npm
      const expectedCmd = process.platform === "win32" ? "npm.cmd" : "npm";
      expect(mockExecFileSync).toHaveBeenCalledWith(
        expectedCmd,
        ["install"],
        expect.anything()
      );
      expect(result.success).toBe(true);
    });

    it("should handle npm test command", () => {
      mockExecFileSync.mockReturnValue("All tests passed");

      const result = npm(["test"]);

      expect(result.success).toBe(true);
      expect(result.stdout).toBe("All tests passed");
    });
  });

  describe("commandExists", () => {
    it("should return true when command exists", () => {
      mockExecFileSync.mockReturnValue("/usr/bin/node");

      const result = commandExists("node");

      // On Windows it uses "where", on Unix "which"
      const checkCmd = process.platform === "win32" ? "where" : "which";
      expect(mockExecFileSync).toHaveBeenCalledWith(
        checkCmd,
        ["node"],
        expect.anything()
      );
      expect(result).toBe(true);
    });

    it("should return false when command does not exist", () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error("Command not found");
      });

      const result = commandExists("nonexistent-command");

      expect(result).toBe(false);
    });
  });
});
