/**
 * Fetchers Test Suite
 *
 * Tests for all data fetchers
 */

import { describe, expect, test, vi } from "vitest";
import { fetchMCPServers } from "../src/services/fetchers/mcp-fetcher.js";
import { fetchOfficialMCPServers } from "../src/services/fetchers/official-mcp-fetcher.js";
import { fetchPlugins } from "../src/services/fetchers/plugin-fetcher.js";
import { fetchSkills } from "../src/services/fetchers/skill-fetcher.js";

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
});

describe("Plugin Fetcher", () => {
  describe("fetchPlugins", () => {
    test("should fetch and transform plugins from marketplace", async () => {
      const mockMarketplace = {
        $schema: "https://example.com/schema.json",
        name: "Claude Plugins Official",
        owner: { name: "Anthropic", email: "support@anthropic.com" },
        plugins: [
          {
            name: "test-plugin",
            description: "Test plugin for TypeScript",
            category: "development",
            tags: ["typescript", "lsp"],
            author: { name: "Test Author" },
            homepage: "https://example.com/plugin",
            source: "plugins/test-plugin",
            lspServers: {
              typescript: {
                extensionToLanguage: {
                  ts: "typescript",
                  tsx: "typescript",
                },
              },
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMarketplace,
      } as Response);

      const results = await fetchPlugins();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        name: "test-plugin",
        type: "plugin",
        description: "Test plugin for TypeScript",
        category: "development",
        install: {
          method: "plugin",
          command: "/plugin install test-plugin",
        },
      });
    });

    test("should detect LSP languages and file patterns", async () => {
      const mockMarketplace = {
        name: "Test Marketplace",
        owner: { name: "Test" },
        plugins: [
          {
            name: "python-lsp",
            description: "Python LSP",
            lspServers: {
              pylsp: {
                extensionToLanguage: {
                  py: "python",
                },
              },
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMarketplace,
      } as Response);

      const results = await fetchPlugins();

      expect(results[0].detection.languages).toContain("python");
      expect(results[0].detection.files).toContain("*.py");
    });

    test("should mark Anthropic plugins as official", async () => {
      const mockMarketplace = {
        name: "Test Marketplace",
        owner: { name: "Anthropic" },
        plugins: [
          {
            name: "official-plugin",
            description: "Official plugin",
            author: { name: "Anthropic Team" },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMarketplace,
      } as Response);

      const results = await fetchPlugins();

      expect(results[0].metrics.isOfficial).toBe(true);
      expect(results[0].metrics.source).toBe("official");
    });

    test("should skip plugins with missing required fields", async () => {
      const mockMarketplace = {
        name: "Test Marketplace",
        owner: { name: "Test" },
        plugins: [
          {
            name: "valid-plugin",
            description: "Valid plugin",
          },
          {
            name: "invalid-plugin",
            // Missing description
          },
          {
            // Missing name
            description: "No name plugin",
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockMarketplace,
      } as Response);

      const results = await fetchPlugins();

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("valid-plugin");
    });

    test("should handle API errors gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      const results = await fetchPlugins();

      expect(results).toEqual([]);
    });

    test("should handle network errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const results = await fetchPlugins();

      expect(results).toEqual([]);
    });
  });
});

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

describe("Skill Fetcher", () => {
  describe("fetchSkills", () => {
    test("should parse CSV and extract skills", async () => {
      const mockCSV = `Display Name,Primary Link,Author Name,Author Link,License,Description,Category
TypeScript Skill,https://github.com/owner/ts-skill,Test Author,https://github.com/test,MIT,TypeScript development skill,Skills
Deploy Workflow,https://github.com/owner/deploy,Test Author,https://github.com/test,MIT,Automated deployment workflow,Workflows
Lint Hook,https://github.com/owner/lint,Test Author,https://github.com/test,MIT,Linting pre-commit hook,Hooks`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockCSV,
      } as Response);

      const results = await fetchSkills();

      expect(results.length).toBe(3);
      expect(results.some((r) => r.type === "skill")).toBe(true);
      expect(results.some((r) => r.type === "workflow")).toBe(true);
      expect(results.some((r) => r.type === "hook")).toBe(true);
    });

    test("should categorize items by category column", async () => {
      const mockCSV = `Display Name,Primary Link,Description,Category
Test Skill,https://github.com/test/skill,Test skill,Skills
Test Command,https://github.com/test/cmd,Test command,Slash Commands
Test Agent,https://github.com/test/agent,Test agent,Agent Skills`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => mockCSV,
      } as Response);

      const results = await fetchSkills();

      expect(results.length).toBe(3);
      expect(results.some((r) => r.type === "skill")).toBe(true);
      expect(results.some((r) => r.type === "command")).toBe(true);
      expect(results.some((r) => r.type === "skill")).toBe(true); // agent skills map to skill
    });

    test("should handle API errors gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      const results = await fetchSkills();

      expect(results).toEqual([]);
    });

    test("should handle network errors gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const results = await fetchSkills();

      expect(results).toEqual([]);
    });
  });
});
