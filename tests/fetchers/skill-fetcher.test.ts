/**
 * Skill Fetcher Test Suite
 *
 * Tests for skill fetcher
 */

import { describe, expect, test, vi } from "vitest";
import { fetchSkills } from "../../src/services/fetchers/skill-fetcher.js";

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
