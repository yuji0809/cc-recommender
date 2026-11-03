import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { logger } from "../../src/utils/logger.js";

describe("logger", () => {
  let stdoutWrite: MockInstance;
  let stderrWrite: MockInstance;
  let consoleLog: MockInstance;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Normal Cases", () => {
    it.each(["info", "warn", "error"] as const)("should write %s messages to stderr", (level) => {
      logger[level]("loaded", 3, "items");

      expect(stderrWrite).toHaveBeenCalledWith("loaded 3 items\n");
    });
  });

  describe("Edge Cases", () => {
    it.each([
      "info",
      "warn",
      "error",
    ] as const)("should never write %s messages to stdout (the MCP stdio channel)", (level) => {
      logger[level]("message");

      expect(stdoutWrite).not.toHaveBeenCalled();
      expect(consoleLog).not.toHaveBeenCalled();
    });

    it("should format objects like console.log", () => {
      logger.info("count:", { a: 1 });

      expect(stderrWrite).toHaveBeenCalledWith("count: { a: 1 }\n");
    });
  });
});
