/**
 * Official MCP Fetcher Test Suite
 *
 * Tests for official MCP server fetcher
 */

import { describe, expect, test, vi } from "vitest";
import {
  fetchOfficialMCPServers,
  MAX_OFFICIAL_SERVERS,
} from "../../src/services/fetchers/mcp/official-mcp-fetcher.js";

describe("Official MCP Fetcher", () => {
  describe("fetchOfficialMCPServers", () => {
    test("should fetch and transform servers from registry API", async () => {
      // Mock API response with realistic data
      const mockResponse = {
        servers: [
          {
            server: {
              name: "test.example/test-server",
              description: "Test MCP server for GitHub integration",
              version: "1.0.0",
              repository: {
                url: "https://github.com/test/test-server",
                source: "github",
              },
              packages: [
                {
                  registryType: "npm",
                  identifier: "test-mcp-server",
                  version: "1.0.0",
                  transport: {
                    type: "stdio",
                  },
                },
              ],
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "active",
                publishedAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-15T00:00:00Z",
                isLatest: true,
              },
            },
          },
        ],
        metadata: {
          count: 1,
        },
      };

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await fetchOfficialMCPServers();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        name: "test.example/test-server",
        type: "mcp",
        description: "Test MCP server for GitHub integration",
        url: "https://github.com/test/test-server",
        metrics: {
          source: "official",
          isOfficial: true,
        },
        install: {
          method: "mcp-add",
          command: "npx test-mcp-server",
        },
      });
    });

    test("should handle pagination", async () => {
      // First page
      const mockResponse1 = {
        servers: [
          {
            server: {
              name: "test1/server1",
              description: "First server",
              version: "1.0.0",
              repository: {
                url: "https://github.com/test1/server1",
                source: "github",
              },
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "active",
                publishedAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-15T00:00:00Z",
                isLatest: true,
              },
            },
          },
        ],
        metadata: {
          nextCursor: "cursor123",
          count: 1,
        },
      };

      // Second page
      const mockResponse2 = {
        servers: [
          {
            server: {
              name: "test2/server2",
              description: "Second server",
              version: "1.0.0",
              repository: {
                url: "https://github.com/test2/server2",
                source: "github",
              },
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "active",
                publishedAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-15T00:00:00Z",
                isLatest: true,
              },
            },
          },
        ],
        metadata: {
          count: 1,
        },
      };

      // Mock fetch to return different responses
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        } as Response);

      const results = await fetchOfficialMCPServers();

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe("test1/server1");
      expect(results[1].name).toBe("test2/server2");
    });

    test("should filter out inactive servers", async () => {
      const mockResponse = {
        servers: [
          {
            server: {
              name: "active/server",
              description: "Active server",
              version: "1.0.0",
              repository: { url: "https://github.com/active/server", source: "github" },
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "active",
                publishedAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-15T00:00:00Z",
                isLatest: true,
              },
            },
          },
          {
            server: {
              name: "inactive/server",
              description: "Inactive server",
              version: "1.0.0",
              repository: { url: "https://github.com/inactive/server", source: "github" },
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "inactive",
                publishedAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-15T00:00:00Z",
                isLatest: true,
              },
            },
          },
        ],
        metadata: {
          count: 2,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await fetchOfficialMCPServers();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("active/server");
    });

    test("should handle NPM packages", async () => {
      const mockResponse = {
        servers: [
          {
            server: {
              name: "test/npm-server",
              description: "NPM package server",
              version: "1.0.0",
              repository: { url: "https://github.com/test/npm-server", source: "github" },
              packages: [
                {
                  registryType: "npm",
                  identifier: "@test/npm-server",
                  version: "1.0.0",
                },
              ],
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "active",
                publishedAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-15T00:00:00Z",
                isLatest: true,
              },
            },
          },
        ],
        metadata: {
          count: 1,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await fetchOfficialMCPServers();

      expect(results[0].install.command).toBe("npx @test/npm-server");
    });

    test("should handle PyPI packages", async () => {
      const mockResponse = {
        servers: [
          {
            server: {
              name: "test/pypi-server",
              description: "PyPI package server",
              version: "1.0.0",
              repository: { url: "https://github.com/test/pypi-server", source: "github" },
              packages: [
                {
                  registryType: "pypi",
                  identifier: "test-pypi-server",
                  version: "1.0.0",
                },
              ],
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "active",
                publishedAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-15T00:00:00Z",
                isLatest: true,
              },
            },
          },
        ],
        metadata: {
          count: 1,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await fetchOfficialMCPServers();

      expect(results[0].install.command).toBe("uvx test-pypi-server");
    });

    test("should infer categories correctly", async () => {
      const mockResponse = {
        servers: [
          {
            server: {
              name: "test/postgres-connector",
              description: "PostgreSQL database connector",
              version: "1.0.0",
              repository: { url: "https://github.com/test/postgres-connector", source: "github" },
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "active",
                publishedAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-15T00:00:00Z",
                isLatest: true,
              },
            },
          },
        ],
        metadata: {
          count: 1,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await fetchOfficialMCPServers();

      expect(results[0].category).toBe("database");
    });

    test("should handle API errors gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      const results = await fetchOfficialMCPServers();

      expect(results).toEqual([]);
    });

    test("should handle network errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const results = await fetchOfficialMCPServers();

      expect(results).toEqual([]);
    });

    test("should skip entries with missing required fields", async () => {
      const mockResponse = {
        servers: [
          {
            server: {
              name: "valid/server",
              description: "Valid server",
              version: "1.0.0",
              repository: { url: "https://github.com/valid/server", source: "github" },
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "active",
                publishedAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-15T00:00:00Z",
                isLatest: true,
              },
            },
          },
          {
            server: {
              name: "invalid/server",
              // Missing description
              version: "1.0.0",
              repository: { url: "https://github.com/invalid/server", source: "github" },
            },
            _meta: {
              "io.modelcontextprotocol.registry/official": {
                status: "active",
                publishedAt: "2025-01-01T00:00:00Z",
                updatedAt: "2025-01-15T00:00:00Z",
                isLatest: true,
              },
            },
          },
        ],
        metadata: {
          count: 2,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await fetchOfficialMCPServers();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("valid/server");
    });
  });

  describe("Registry truncation", () => {
    const entry = (name: string, url: string | undefined, updatedAt: string) => ({
      server: {
        name,
        description: `desc ${name}`,
        version: "1.0.0",
        ...(url ? { repository: { url, source: "github" } } : {}),
      },
      _meta: {
        "io.modelcontextprotocol.registry/official": {
          status: "active",
          publishedAt: "2025-01-01T00:00:00Z",
          updatedAt,
          isLatest: true,
        },
      },
    });

    const pagedFetch = (pages: unknown[][]) =>
      vi.fn().mockImplementation(async (input: string | URL) => {
        const cursor = new URL(input.toString()).searchParams.get("cursor");
        const index = cursor ? Number(cursor) : 0;
        const last = index === pages.length - 1;
        return {
          ok: true,
          json: async () => ({
            servers: pages[index],
            metadata: {
              count: pages[index].length,
              ...(last ? {} : { nextCursor: String(index + 1) }),
            },
          }),
        } as Response;
      });

    test("should follow the cursor past 100 pages until the registry ends", async () => {
      const pages = Array.from({ length: 150 }, (_, i) => [
        entry(`org/server-${i}`, `https://github.com/org/server-${i}`, "2025-01-01T00:00:00Z"),
      ]);
      global.fetch = pagedFetch(pages);

      const results = await fetchOfficialMCPServers();

      expect(results).toHaveLength(150);
    });

    test("should skip entries without a repository or homepage URL", async () => {
      global.fetch = pagedFetch([
        [
          entry("org/no-url", undefined, "2025-01-01T00:00:00Z"),
          entry("org/with-url", "https://github.com/org/with-url", "2025-01-01T00:00:00Z"),
        ],
      ]);

      const results = await fetchOfficialMCPServers();

      expect(results.map((r) => r.name)).toEqual(["org/with-url"]);
    });

    test("should keep only the most recently updated servers when over the cap", async () => {
      const total = MAX_OFFICIAL_SERVERS + 5;
      const items = Array.from({ length: total }, (_, i) =>
        entry(
          `org/server-${i}`,
          `https://github.com/org/server-${i}`,
          new Date(Date.UTC(2025, 0, 1) + i * 60_000).toISOString(),
        ),
      );
      global.fetch = pagedFetch([items]);

      const results = await fetchOfficialMCPServers();

      expect(results).toHaveLength(MAX_OFFICIAL_SERVERS);
      expect(results.some((r) => r.name === "org/server-0")).toBe(false);
      expect(results.some((r) => r.name === `org/server-${total - 1}`)).toBe(true);
    });
  });
});
