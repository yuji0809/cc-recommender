import { afterEach, describe, expect, it, vi } from "vitest";

async function loadEnv() {
  vi.resetModules();
  const { ENV } = await import("../../src/config/env.js");
  return ENV;
}

describe("ENV.SECURITY_SCAN_TIME_LIMIT_MINUTES", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Normal Cases", () => {
    it("should parse a positive integer", async () => {
      vi.stubEnv("SECURITY_SCAN_TIME_LIMIT_MINUTES", "70");

      expect((await loadEnv()).SECURITY_SCAN_TIME_LIMIT_MINUTES).toBe(70);
    });
  });

  describe("Edge Cases", () => {
    it("should be undefined when unset", async () => {
      vi.stubEnv("SECURITY_SCAN_TIME_LIMIT_MINUTES", "");

      expect((await loadEnv()).SECURITY_SCAN_TIME_LIMIT_MINUTES).toBeUndefined();
    });

    it.each(["0", "-5", "abc", "1.5"])("should ignore an invalid value (%s)", async (value) => {
      vi.stubEnv("SECURITY_SCAN_TIME_LIMIT_MINUTES", value);

      expect((await loadEnv()).SECURITY_SCAN_TIME_LIMIT_MINUTES).toBeUndefined();
    });
  });
});
