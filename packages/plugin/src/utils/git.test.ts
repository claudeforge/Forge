import { describe, it, expect, vi, beforeEach } from "vitest";
import { isGitRepo, createStash, applyStash, dropStash, getChangedFiles } from "./git.js";

// Mock shell utility
vi.mock("./shell.js", () => ({
  git: vi.fn(),
}));

import { git } from "./shell.js";

const mockGit = vi.mocked(git);

describe("Git Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isGitRepo", () => {
    it("should return true when inside git repository", () => {
      mockGit.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "true",
        stderr: "",
      });

      expect(isGitRepo()).toBe(true);
      expect(mockGit).toHaveBeenCalledWith(["rev-parse", "--is-inside-work-tree"]);
    });

    it("should return false when not in git repository", () => {
      mockGit.mockReturnValue({
        success: false,
        exitCode: 128,
        stdout: "",
        stderr: "fatal: not a git repository",
      });

      expect(isGitRepo()).toBe(false);
    });
  });

  describe("createStash", () => {
    it("should return null when not in git repo", () => {
      mockGit.mockReturnValue({
        success: false,
        exitCode: 128,
        stdout: "",
        stderr: "",
      });

      const result = createStash("test-message");

      expect(result).toBeNull();
    });

    it("should return 'clean' when there are no changes to stash", () => {
      mockGit
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "true", stderr: "" }) // isGitRepo
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "", stderr: "" }); // git status --porcelain (empty = no changes)

      const result = createStash("test-message");

      expect(result).toBe("clean");
    });

    it("should create stash and return ref when changes exist", () => {
      mockGit
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "true", stderr: "" }) // isGitRepo
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "M file.ts", stderr: "" }) // git status --porcelain
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "", stderr: "" }) // git add -A
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "Saved working directory", stderr: "" }) // git stash push
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "abc123def", stderr: "" }); // git rev-parse

      const result = createStash("test-message");

      expect(result).toBe("abc123def");
      expect(mockGit).toHaveBeenCalledWith(["stash", "push", "-m", "test-message", "--include-untracked"]);
    });

    it("should fallback to stash@{0} when rev-parse fails", () => {
      mockGit
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "true", stderr: "" }) // isGitRepo
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "M file.ts", stderr: "" }) // git status --porcelain
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "", stderr: "" }) // git add -A
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "Saved working directory", stderr: "" }) // git stash push
        .mockReturnValueOnce({ success: false, exitCode: 1, stdout: "", stderr: "" }); // git rev-parse fails

      const result = createStash("test-message");

      expect(result).toBe("stash@{0}");
    });

    it("should return 'clean' when stash says no local changes", () => {
      mockGit
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "true", stderr: "" }) // isGitRepo
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "M file.ts", stderr: "" }) // git status --porcelain
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "", stderr: "" }) // git add -A
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "No local changes to save", stderr: "" }); // git stash push

      const result = createStash("test-message");

      expect(result).toBe("clean");
    });
  });

  describe("applyStash", () => {
    it("should return true for 'clean' ref without calling git", () => {
      const result = applyStash("clean");

      expect(result).toBe(true);
      expect(mockGit).not.toHaveBeenCalled();
    });

    it("should return true for 'none' ref without calling git", () => {
      const result = applyStash("none");

      expect(result).toBe(true);
      expect(mockGit).not.toHaveBeenCalled();
    });

    it("should apply stash and return true on success", () => {
      mockGit.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const result = applyStash("abc123");

      expect(result).toBe(true);
      expect(mockGit).toHaveBeenCalledWith(["stash", "apply", "abc123"]);
    });

    it("should return false when stash apply fails", () => {
      mockGit.mockReturnValue({
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: "error: Your local changes would be overwritten",
      });

      const result = applyStash("abc123");

      expect(result).toBe(false);
    });
  });

  describe("dropStash", () => {
    it("should drop stash and return true on success", () => {
      mockGit.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "Dropped refs/stash@{0}",
        stderr: "",
      });

      const result = dropStash("stash@{0}");

      expect(result).toBe(true);
      expect(mockGit).toHaveBeenCalledWith(["stash", "drop", "stash@{0}"]);
    });

    it("should return false when stash drop fails", () => {
      mockGit.mockReturnValue({
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: "error: stash not found",
      });

      const result = dropStash("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("getChangedFiles", () => {
    it("should return empty arrays when not in git repo", () => {
      mockGit.mockReturnValue({
        success: false,
        exitCode: 128,
        stdout: "",
        stderr: "",
      });

      const result = getChangedFiles();

      expect(result).toEqual({ created: [], modified: [] });
    });

    it("should return created and modified files", () => {
      mockGit
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "true", stderr: "" }) // isGitRepo
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "new-file.ts\nanother-new.ts", stderr: "" }) // untracked
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "modified.ts", stderr: "" }) // modified
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "staged.ts", stderr: "" }); // staged

      const result = getChangedFiles();

      expect(result.created).toEqual(["new-file.ts", "another-new.ts"]);
      expect(result.modified).toContain("modified.ts");
      expect(result.modified).toContain("staged.ts");
    });

    it("should not duplicate files in modified list", () => {
      mockGit
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "true", stderr: "" }) // isGitRepo
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "", stderr: "" }) // untracked
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "file.ts", stderr: "" }) // modified
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "file.ts", stderr: "" }); // staged (same file)

      const result = getChangedFiles();

      expect(result.modified).toEqual(["file.ts"]);
      expect(result.modified).toHaveLength(1);
    });

    it("should handle empty output", () => {
      mockGit
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "true", stderr: "" }) // isGitRepo
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "", stderr: "" }) // untracked
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "", stderr: "" }) // modified
        .mockReturnValueOnce({ success: true, exitCode: 0, stdout: "", stderr: "" }); // staged

      const result = getChangedFiles();

      expect(result).toEqual({ created: [], modified: [] });
    });
  });
});
