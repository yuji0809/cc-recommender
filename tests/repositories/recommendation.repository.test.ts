import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const remoteFile = (type: string) => ({
  version: "9.9.9",
  lastUpdated: "2026-11-01T00:00:00Z",
  items: [{ id: `${type}-1`, name: `${type} 1`, type }],
});

function respond(body: unknown): Response {
  return new Response(new TextEncoder().encode(JSON.stringify(body)), {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

async function loadRepositoryModule(offline: boolean) {
  vi.stubEnv("CC_RECOMMENDER_OFFLINE_MODE", offline ? "true" : "false");
  vi.resetModules();
  return import("../../src/repositories/recommendation.repository.js");
}

describe("RecommendationRepository", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  describe("offline mode", () => {
    it("should load the bundled data without writing to stdout", async () => {
      const { RecommendationRepository } = await loadRepositoryModule(true);

      const database = await new RecommendationRepository().load();

      expect(database.items.length).toBeGreaterThan(0);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should return an empty database when the bundled data cannot be read", async () => {
      const { RecommendationRepository } = await loadRepositoryModule(true);

      const database = await new RecommendationRepository(
        "/nonexistent/cc-recommender-data",
      ).load();

      expect(database).toMatchObject({ version: "0.0.0", items: [] });
    });
  });

  describe("remote data", () => {
    it("should use the remote data when it loads", async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (url.endsWith("/plugins.json")) return respond(remoteFile("plugin"));
        if (url.endsWith("/mcp-servers.json")) return respond(remoteFile("mcp"));
        return respond(remoteFile("skill"));
      });
      const { RecommendationRepository } = await loadRepositoryModule(false);

      const database = await new RecommendationRepository().load();

      expect(database.version).toBe("9.9.9");
      expect(database.items.map((item) => item.id)).toEqual(["plugin-1", "mcp-1", "skill-1"]);
    });

    it("should fall back to the bundled data when the remote fetch fails", async () => {
      fetchMock.mockRejectedValue(new Error("offline"));
      const { RecommendationRepository } = await loadRepositoryModule(false);

      const database = await new RecommendationRepository().load();

      expect(database.version).not.toBe("9.9.9");
      expect(database.items.length).toBeGreaterThan(0);
    });
  });

  describe("cache", () => {
    it("should reload after the cache expires", async () => {
      const { RecommendationRepository } = await loadRepositoryModule(true);
      const repository = new RecommendationRepository();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(0);

      const first = await repository.load();
      expect(await repository.load()).toBe(first);

      nowSpy.mockReturnValue(2 * 60 * 60 * 1000);
      const reloaded = await repository.load();

      expect(reloaded).not.toBe(first);
      expect(reloaded.items.length).toBe(first.items.length);
    });
  });
});
