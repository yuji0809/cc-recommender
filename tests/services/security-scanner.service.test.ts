import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type SecurityScanResult,
  scanRepositories,
} from "../../src/services/security-scanner.service.js";

const okResult = (): SecurityScanResult => ({
  score: 100,
  findings: { critical: 0, high: 0, medium: 0, low: 0 },
  success: true,
});

const makeRepos = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    url: `https://github.com/owner/repo-${i}`,
    type: "mcp" as const,
  }));

describe("scanRepositories", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Normal Cases", () => {
    it("should scan every repository when no deadline is given", async () => {
      const scan = vi.fn(async () => okResult());

      const results = await scanRepositories(makeRepos(5), 2, { scan });

      expect(scan).toHaveBeenCalledTimes(5);
      expect(results.size).toBe(5);
    });

    it("should run at most `concurrency` scans per batch", async () => {
      let running = 0;
      let maxRunning = 0;
      const scan = vi.fn(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await Promise.resolve();
        running--;
        return okResult();
      });

      await scanRepositories(makeRepos(7), 3, { scan });

      expect(maxRunning).toBe(3);
    });
  });

  describe("Deadline", () => {
    it("should stop starting new batches once the deadline has passed", async () => {
      let now = 0;
      // 1 回のスキャンで時計が 10 進む
      const scan = vi.fn(async () => {
        now += 10;
        return okResult();
      });

      // 1 batch 目（2 件）で now = 20 になり、deadline 15 を過ぎるので 2 batch 目は始めない
      const results = await scanRepositories(makeRepos(6), 2, {
        scan,
        deadline: 15,
        now: () => now,
      });

      expect(scan).toHaveBeenCalledTimes(2);
      expect([...results.keys()]).toEqual([
        "https://github.com/owner/repo-0",
        "https://github.com/owner/repo-1",
      ]);
    });

    it("should not scan anything when the deadline has already passed", async () => {
      const scan = vi.fn(async () => okResult());

      const results = await scanRepositories(makeRepos(3), 2, {
        scan,
        deadline: 100,
        now: () => 100,
      });

      expect(scan).not.toHaveBeenCalled();
      expect(results.size).toBe(0);
    });
  });
});
