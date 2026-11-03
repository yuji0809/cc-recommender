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
