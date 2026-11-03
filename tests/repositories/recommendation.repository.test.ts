import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("RecommendationRepository", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("load (offline mode)", () => {
    it("should load the bundled data without writing to stdout", async () => {
      vi.stubEnv("CC_RECOMMENDER_OFFLINE_MODE", "true");
      vi.resetModules();
      const { RecommendationRepository } = await import(
        "../../src/repositories/recommendation.repository.js"
      );

      const database = await new RecommendationRepository().load();

      expect(database.items.length).toBeGreaterThan(0);
      expect(console.log).not.toHaveBeenCalled();
    });
  });
});
