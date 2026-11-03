import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRemoteData } from "../../src/repositories/remote-data.repository.js";

const validDatabase = {
  version: "1.0.0",
  lastUpdated: "2026-11-01T00:00:00Z",
  items: [{ id: "plugin-a", name: "Plugin A", type: "plugin" }],
};

function jsonResponse(contentType: string | null, body: unknown = validDatabase): Response {
  const headers = new Headers();
  if (contentType) {
    headers.set("content-type", contentType);
  }
  // 文字列の本文だと text/plain が自動付与されるため、バイト列で渡す
  return new Response(new TextEncoder().encode(JSON.stringify(body)), { status: 200, headers });
}

/**
 * ヘッダーは即座に返し、本文 (json()) の解決を遅らせるレスポンス
 * delayMs が null の場合は abort されるまで解決しない
 */
function slowBodyResponse(signal: AbortSignal, delayMs: number | null): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: () =>
      new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
        });
        if (delayMs !== null) {
          setTimeout(() => resolve(validDatabase), delayMs);
        }
      }),
  } as unknown as Response;
}

describe("fetchRemoteData", () => {
  const fetchMock = vi.fn();
  let urlCounter = 0;
  const nextUrl = () => `https://example.com/data-${urlCounter++}.json`;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  describe("Normal Cases", () => {
    it("should accept application/json responses", async () => {
      fetchMock.mockResolvedValue(jsonResponse("application/json; charset=utf-8"));

      const result = await fetchRemoteData(nextUrl());

      expect(result?.items).toHaveLength(1);
    });

    it("should accept text/plain responses (raw.githubusercontent.com)", async () => {
      fetchMock.mockResolvedValue(jsonResponse("text/plain; charset=utf-8"));

      const result = await fetchRemoteData(nextUrl());

      expect(result?.items).toHaveLength(1);
    });

    it("should allow downloads that take longer than 10 seconds", async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
        slowBodyResponse(init.signal as AbortSignal, 10_000),
      );

      const promise = fetchRemoteData(nextUrl());
      await vi.advanceTimersByTimeAsync(10_000);

      await expect(promise).resolves.not.toBeNull();
    });
  });

  describe("Default data files (plugins / mcp-servers / skills)", () => {
    type Item = { id?: unknown; name?: unknown; type?: unknown; description?: string };
    const file = (items: Item[]) => ({ version: "1.0.0", lastUpdated: "2026-11-01", items });
    const validFiles = {
      plugins: file([{ id: "p1", name: "Plugin 1", type: "plugin" }]),
      mcp: file([{ id: "m1", name: "MCP 1", type: "mcp" }]),
      skills: file([
        { id: "s1", name: "Skill 1", type: "skill" },
        { id: "w1", name: "Workflow 1", type: "workflow" },
      ]),
    };

    const routeFetch = (overrides: Partial<Record<keyof typeof validFiles, unknown>> = {}) => {
      const files = { ...validFiles, ...overrides };
      fetchMock.mockImplementation(async (url: string) => {
        if (url.endsWith("/plugins.json")) return jsonResponse("text/plain", files.plugins);
        if (url.endsWith("/mcp-servers.json")) return jsonResponse("text/plain", files.mcp);
        if (url.endsWith("/skills.json")) return jsonResponse("text/plain", files.skills);
        throw new Error(`unexpected url ${url}`);
      });
    };

    it("should merge the three files into one database", async () => {
      routeFetch();

      const result = await fetchRemoteData();

      expect(result?.items.map((item) => item.id)).toEqual(["p1", "m1", "s1", "w1"]);
      expect(result?.version).toBe("1.0.0");
    });

    it.each([
      ["missing id", { name: "x", type: "plugin" }],
      ["missing name", { id: "x", type: "plugin" }],
      ["missing type", { id: "x", name: "x" }],
      ["unexpected type", { id: "x", name: "x", type: "mcp" }],
      [
        "item larger than 100KB",
        { id: "x", name: "x", type: "plugin", description: "x".repeat(101 * 1024) },
      ],
    ])("should return null when a file has an invalid item (%s)", async (_label, item) => {
      routeFetch({ plugins: file([item]) });

      await expect(fetchRemoteData()).resolves.toBeNull();
    });

    it("should return null when a file has more than 50,000 items", async () => {
      const items = Array.from({ length: 50_001 }, (_, i) => ({
        id: `m${i}`,
        name: "m",
        type: "mcp",
      }));
      routeFetch({ mcp: file(items) });

      await expect(fetchRemoteData()).resolves.toBeNull();
    });

    it("should return null when a file is larger than 50MB", async () => {
      const items = Array.from({ length: 600 }, (_, i) => ({
        id: `s${i}`,
        name: "s",
        type: "skill",
        description: "x".repeat(90 * 1024),
      }));
      routeFetch({ skills: file(items) });

      await expect(fetchRemoteData()).resolves.toBeNull();
    });
  });

  describe("HTTP handling", () => {
    it("should send If-None-Match and return the cached data on 304", async () => {
      const url = nextUrl();
      const withEtag = jsonResponse("application/json");
      withEtag.headers.set("etag", '"abc123456789xyz"');
      fetchMock.mockResolvedValueOnce(withEtag);
      await fetchRemoteData(url);

      fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));
      const cached = await fetchRemoteData(url);

      expect(cached?.items).toHaveLength(1);
      const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["If-None-Match"]).toBe('"abc123456789xyz"');
    });

    it("should return null on 304 when nothing is cached", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 304 }));

      await expect(fetchRemoteData(nextUrl())).resolves.toBeNull();
    });

    it("should return null on an HTTP error status", async () => {
      fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));

      await expect(fetchRemoteData(nextUrl())).resolves.toBeNull();
    });

    it("should return null on a network error", async () => {
      fetchMock.mockRejectedValue(new Error("ECONNRESET"));

      await expect(fetchRemoteData(nextUrl())).resolves.toBeNull();
    });

    it("should return null when an unexpected error is thrown", async () => {
      vi.mocked(process.stderr.write).mockImplementationOnce(() => {
        throw new Error("stderr closed");
      });
      fetchMock.mockResolvedValue(jsonResponse("application/json"));

      await expect(fetchRemoteData()).resolves.toBeNull();
    });
  });

  describe("Single file validation", () => {
    it.each([
      ["missing id", { name: "x", type: "plugin" }],
      ["missing name", { id: "x", type: "plugin" }],
      ["missing type", { id: "x", name: "x" }],
      ["unknown type", { id: "x", name: "x", type: "unknown" }],
    ])("should return null when an item is invalid (%s)", async (_label, item) => {
      fetchMock.mockResolvedValue(
        jsonResponse("application/json", { ...validDatabase, items: [item] }),
      );

      await expect(fetchRemoteData(nextUrl())).resolves.toBeNull();
    });
  });

  describe("Logging", () => {
    it("should not write to stdout, which is the MCP stdio channel", async () => {
      fetchMock.mockResolvedValue(jsonResponse("application/json"));

      await fetchRemoteData(nextUrl());

      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe("Size Limits", () => {
    const makeDatabase = (count: number, padding = 0) => ({
      ...validDatabase,
      items: Array.from({ length: count }, (_, i) => ({
        id: `plugin-${i}`,
        name: `Plugin ${i}`,
        type: "plugin",
        ...(padding > 0 ? { description: "x".repeat(padding) } : {}),
      })),
    });

    it("should accept more than 10,000 items", async () => {
      fetchMock.mockResolvedValue(jsonResponse("text/plain", makeDatabase(10_001)));

      const result = await fetchRemoteData(nextUrl());

      expect(result?.items).toHaveLength(10_001);
    });

    it("should reject more than 50,000 items", async () => {
      fetchMock.mockResolvedValue(jsonResponse("text/plain", makeDatabase(50_001)));

      await expect(fetchRemoteData(nextUrl())).resolves.toBeNull();
    });

    it("should accept JSON larger than 10MB", async () => {
      // 200 items x 60KB = 約 12MB（1アイテム 100KB 未満）
      fetchMock.mockResolvedValue(jsonResponse("text/plain", makeDatabase(200, 60 * 1024)));

      const result = await fetchRemoteData(nextUrl());

      expect(result?.items).toHaveLength(200);
    });

    it("should reject JSON larger than 50MB", async () => {
      // 600 items x 90KB = 約 53MB（1アイテム 100KB 未満）
      fetchMock.mockResolvedValue(jsonResponse("text/plain", makeDatabase(600, 90 * 1024)));

      await expect(fetchRemoteData(nextUrl())).resolves.toBeNull();
    });

    it("should still reject a single item larger than 100KB", async () => {
      fetchMock.mockResolvedValue(jsonResponse("text/plain", makeDatabase(1, 101 * 1024)));

      await expect(fetchRemoteData(nextUrl())).resolves.toBeNull();
    });
  });

  describe("Error Cases", () => {
    it("should reject responses with an unexpected content-type", async () => {
      fetchMock.mockResolvedValue(jsonResponse("text/html; charset=utf-8"));

      await expect(fetchRemoteData(nextUrl())).resolves.toBeNull();
    });

    it("should reject responses without a content-type", async () => {
      fetchMock.mockResolvedValue(jsonResponse(null));

      await expect(fetchRemoteData(nextUrl())).resolves.toBeNull();
    });

    it("should reject text/plain responses that fail validation", async () => {
      fetchMock.mockResolvedValue(jsonResponse("text/plain", { foo: "bar" }));

      await expect(fetchRemoteData(nextUrl())).resolves.toBeNull();
    });

    it("should abort when the body download never completes", async () => {
      vi.useFakeTimers();
      fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
        slowBodyResponse(init.signal as AbortSignal, null),
      );

      const promise = fetchRemoteData(nextUrl());
      await vi.advanceTimersByTimeAsync(60_000);

      await expect(promise).resolves.toBeNull();
    });
  });
});
