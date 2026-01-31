/**
 * MCP Fetcher (awesome-mcp-servers) Test Suite
 *
 * Tests for awesome-mcp-servers fetcher
 */

import { describe, expect, test, vi } from "vitest";
import { fetchMCPServers } from "../../src/services/fetchers/mcp-fetcher.js";

describe("MCP Fetcher (awesome-mcp-servers)", () => {
  describe("fetchMCPServers", () => {
    test("should parse markdown and extract MCP servers", async () => {
      const mockMarkdown = `# Awesome MCP Servers

## Servers

### 🗄️ <a name="databases"></a>Databases

- [owner/postgres-mcp](https://github.com/owner/postgres-mcp) 🐍 - PostgreSQL database integration
- [owner/mongodb-mcp](https://github.com/owner/mongodb-mcp) 📇 - MongoDB database connector
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockMarkdown,
      } as Response);

      const results = await fetchMCPServers();

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.url.includes("postgres-mcp"))).toBe(true);
      expect(results.some((r) => r.url.includes("mongodb-mcp"))).toBe(true);
    });

    test("should detect language from emoji", async () => {
      const mockMarkdown = `### 🗄️ <a name="databases"></a>Databases
- [test/python-server](https://github.com/test/python) 🐍 - Python server
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockMarkdown,
      } as Response);

      const results = await fetchMCPServers();

      expect(results.length).toBeGreaterThan(0);
      const pythonServer = results[0];
      expect(pythonServer.tags).toContain("python");
    });

    test("should detect official servers from emoji", async () => {
      const mockMarkdown = `### 🗄️ <a name="databases"></a>Databases
- [anthropic/official-server](https://github.com/anthropic/official) 🎖️ - Official server
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockMarkdown,
      } as Response);

      const results = await fetchMCPServers();

      expect(results.length).toBeGreaterThan(0);
      const officialServer = results[0];
      expect(officialServer.metrics.isOfficial).toBe(true);
    });

    test("should extract category from section headers", async () => {
      const mockMarkdown = `### 🗄️ <a name="databases"></a>Databases
- [test/db-server](https://github.com/test/db) - Database server

### 🔒 <a name="security"></a>Security
- [test/security-server](https://github.com/test/security) - Security server
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockMarkdown,
      } as Response);

      const results = await fetchMCPServers();

      expect(results.length).toBe(2);
      // Categories are captured from headers
      const categories = results.map((r) => r.category.toLowerCase());
      expect(categories.some((c) => c.includes("database"))).toBe(true);
    });

    test("should handle API errors gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      const results = await fetchMCPServers();

      expect(results).toEqual([]);
    });

    test("should handle network errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const results = await fetchMCPServers();

      expect(results).toEqual([]);
    });
  });
});
