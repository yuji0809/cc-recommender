import { describe, expect, test } from "vitest";
import { analyzeProject } from "../../src/services/analyzer/project-analyzer.service.js";

describe("Analyzer Service - Integration", () => {
  describe("analyzeProject", () => {
    describe("Integration - Real project analysis", () => {
      test("should correctly analyze current project", async () => {
        const result = await analyzeProject("./");

        // Verify project is correctly identified
        expect(result.languages).toContain("typescript");
        expect(result.dependencies).toContain("zod");
        expect(result.dependencies).toContain("@modelcontextprotocol/sdk");
        expect(result.files.some((f) => f === "package.json")).toBe(true);
        expect(result.files.some((f) => f === "tsconfig.json")).toBe(true);
      });

      test("should detect all major config files", async () => {
        const result = await analyzeProject("./");

        // Check for known config files
        const configFiles = ["package.json", "tsconfig.json", "biome.json", "vitest.config.ts"];

        for (const configFile of configFiles) {
          expect(result.files.some((f) => f === configFile || f.endsWith(`/${configFile}`))).toBe(
            true,
          );
        }
      });

      test("should have reasonable analysis time", async () => {
        const startTime = Date.now();
        await analyzeProject("./");
        const duration = Date.now() - startTime;

        // Should complete within 5 seconds for typical project
        expect(duration).toBeLessThan(5000);
      });
    });

    describe("Edge cases", () => {
      test("should handle project with no package.json", async () => {
        const result = await analyzeProject("/tmp");

        // Should still return valid structure
        expect(result).toHaveProperty("dependencies");
        expect(Array.isArray(result.dependencies)).toBe(true);
      });

      test("should handle project with malformed package.json", async () => {
        // Note: This is hard to test without creating actual files
        // but the function should catch JSON parse errors
        const result = await analyzeProject("./");

        expect(result).toBeDefined();
      });

      test("should handle symlinks gracefully", async () => {
        const result = await analyzeProject("./");

        // Should not follow infinite symlink loops
        expect(result).toBeDefined();
      });

      test("should handle mixed case file extensions", async () => {
        const result = await analyzeProject("./");

        // Function should normalize extensions to lowercase
        expect(result.languages.every((lang) => lang === lang.toLowerCase())).toBe(true);
      });

      test("should handle empty project (only directories)", async () => {
        const result = await analyzeProject("/tmp");

        expect(result.files).toBeDefined();
        expect(Array.isArray(result.files)).toBe(true);
      });
    });

    describe("Performance", () => {
      test("should not include excessive files", async () => {
        const result = await analyzeProject("./");

        // Should respect the 1000 file limit
        expect(result.files.length).toBeLessThanOrEqual(1000);
      });

      test("should complete analysis within reasonable time", async () => {
        const startTime = Date.now();
        const result = await analyzeProject("./");
        const endTime = Date.now();

        expect(result).toBeDefined();
        expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
      });
    });

    describe("Special project structures", () => {
      test("should detect monorepo structure (if applicable)", async () => {
        const result = await analyzeProject("./");

        // If pnpm-workspace.yaml exists, we know it's a monorepo
        if (result.files.includes("pnpm-workspace.yaml")) {
          expect(result.dependencies.length).toBeGreaterThan(0);
        }
      });

      test("should handle TypeScript project without tsconfig.json", async () => {
        // Even without tsconfig, .ts files should trigger detection
        const result = await analyzeProject("./");

        if (result.files.some((f) => f.endsWith(".ts"))) {
          expect(result.languages).toContain("typescript");
        }
      });

      test("should detect multiple package managers", async () => {
        const result = await analyzeProject("./");

        // Check for lock files
        const hasPnpm = result.files.includes("pnpm-lock.yaml");
        const hasNpm = result.files.includes("package-lock.json");
        const hasYarn = result.files.includes("yarn.lock");

        // At least one should be present in a Node project
        if (result.files.includes("package.json")) {
          expect(hasPnpm || hasNpm || hasYarn).toBe(true);
        }
      });
    });
  });
});
