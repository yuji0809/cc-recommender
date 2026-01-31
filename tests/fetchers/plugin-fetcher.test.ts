/**
 * Plugin Fetcher Test Suite
 *
 * Tests for plugin fetcher
 */

import { describe, expect, test, vi } from "vitest";
import { fetchPlugins } from "../../src/services/fetchers/plugin-fetcher.js";

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
