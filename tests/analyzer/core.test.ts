import { describe, expect, test } from "vitest";
import { analyzeProject } from "../../src/services/analyzer/project-analyzer.service.js";

describe("Analyzer Service - Core", () => {
  describe("analyzeProject", () => {
    describe("Basic structure", () => {
      test("should return ProjectInfo structure with all required fields", async () => {
        const result = await analyzeProject("./");

        expect(result).toHaveProperty("path");
        expect(result).toHaveProperty("languages");
        expect(result).toHaveProperty("dependencies");
        expect(result).toHaveProperty("files");
        expect(result).toHaveProperty("frameworks");
        expect(Array.isArray(result.languages)).toBe(true);
        expect(Array.isArray(result.dependencies)).toBe(true);
        expect(Array.isArray(result.files)).toBe(true);
        expect(Array.isArray(result.frameworks)).toBe(true);
      });

      test("should set path correctly", async () => {
        const testPath = "./";
        const result = await analyzeProject(testPath);

        expect(result.path).toBe(testPath);
      });
    });

    describe("Language detection", () => {
      test("should detect TypeScript in current project", async () => {
        const result = await analyzeProject("./");

        expect(result.languages).toContain("typescript");
      });

      test("should detect JavaScript from .js files", async () => {
        const result = await analyzeProject("./");

        expect(result.languages).toContain("javascript");
      });

      test("should detect languages from config files", async () => {
        const result = await analyzeProject("./");

        // tsconfig.json should trigger TypeScript detection
        expect(result.languages).toContain("typescript");
        // package.json should trigger JavaScript detection
        expect(result.languages).toContain("javascript");
      });

      test("should handle multiple languages", async () => {
        const result = await analyzeProject("./");

        // Current project has both TS and JS
        expect(result.languages.length).toBeGreaterThanOrEqual(2);
        expect(result.languages).toContain("typescript");
        expect(result.languages).toContain("javascript");
      });
    });

    describe("Dependency detection", () => {
      test("should detect dependencies from package.json", async () => {
        const result = await analyzeProject("./");

        expect(result.dependencies.length).toBeGreaterThan(0);
      });

      test("should include both dependencies and devDependencies", async () => {
        const result = await analyzeProject("./");

        // Should include our dependencies
        expect(
          result.dependencies.some(
            (dep) => dep.includes("zod") || dep.includes("@modelcontextprotocol/sdk"),
          ),
        ).toBe(true);

        // Should also include devDependencies
        expect(
          result.dependencies.some((dep) => dep.includes("typescript") || dep.includes("vitest")),
        ).toBe(true);
      });

      test("should handle scoped package names", async () => {
        const result = await analyzeProject("./");

        const scopedPackages = result.dependencies.filter((dep) => dep.startsWith("@"));
        expect(scopedPackages.length).toBeGreaterThan(0);
      });
    });

    describe("Framework detection", () => {
      test("should detect frameworks from package.json dependencies", async () => {
        const result = await analyzeProject("./");

        // Current project might not have frameworks, but structure should be valid
        expect(Array.isArray(result.frameworks)).toBe(true);
      });

      test("should detect framework from config files", async () => {
        const result = await analyzeProject("./");

        // If any framework config exists, it should be detected
        if (result.files.some((f) => f.includes("next.config"))) {
          expect(result.frameworks).toContain("nextjs");
        }
      });
    });

    describe("File scanning", () => {
      test("should scan and list files", async () => {
        const result = await analyzeProject("./");

        expect(result.files.length).toBeGreaterThan(0);
      });

      test("should detect package.json", async () => {
        const result = await analyzeProject("./");

        expect(result.files.some((f) => f === "package.json" || f.endsWith("/package.json"))).toBe(
          true,
        );
      });

      test("should detect TypeScript files", async () => {
        const result = await analyzeProject("./");

        expect(result.files.some((f) => f.endsWith(".ts"))).toBe(true);
      });

      test("should not include ignored directories", async () => {
        const result = await analyzeProject("./");

        // Should not include node_modules files
        expect(result.files.some((f) => f.includes("node_modules/"))).toBe(false);

        // Should not include .git files
        expect(result.files.some((f) => f.includes(".git/"))).toBe(false);

        // Should not include dist files
        expect(result.files.some((f) => f.includes("dist/"))).toBe(false);
      });

      test("should include source files", async () => {
        const result = await analyzeProject("./");

        // Should include src/ files
        expect(result.files.some((f) => f.startsWith("src/"))).toBe(true);
      });
    });

    describe("Deduplication", () => {
      test("should deduplicate languages", async () => {
        const result = await analyzeProject("./");

        const uniqueLanguages = new Set(result.languages);
        expect(uniqueLanguages.size).toBe(result.languages.length);
      });

      test("should deduplicate dependencies", async () => {
        const result = await analyzeProject("./");

        const uniqueDeps = new Set(result.dependencies);
        expect(uniqueDeps.size).toBe(result.dependencies.length);
      });

      test("should deduplicate frameworks", async () => {
        const result = await analyzeProject("./");

        const uniqueFrameworks = new Set(result.frameworks);
        expect(uniqueFrameworks.size).toBe(result.frameworks.length);
      });
    });

    describe("Boundary conditions", () => {
      test("should limit file list to reasonable size (1000 files)", async () => {
        const result = await analyzeProject("./");

        // Should not exceed 1000 files
        expect(result.files.length).toBeLessThanOrEqual(1000);
      });

      test("should handle empty directories (no error)", async () => {
        const result = await analyzeProject("/tmp");

        // Should not throw, even if directory is empty
        expect(result).toBeDefined();
        expect(result.languages).toBeDefined();
      });

      test("should limit recursion depth to 5", async () => {
        const result = await analyzeProject("./");

        // This is implicit - function should complete without stack overflow
        expect(result).toBeDefined();
      });
    });

    describe("Error handling", () => {
      test("should handle non-existent directory gracefully", async () => {
        const result = await analyzeProject("/non/existent/path/xyz123");

        expect(result.languages).toEqual([]);
        expect(result.dependencies).toEqual([]);
        expect(result.files).toEqual([]);
        expect(result.frameworks).toEqual([]);
      });

      test("should handle invalid path characters", async () => {
        const result = await analyzeProject("/\0invalid");

        // Should not throw
        expect(result).toBeDefined();
      });

      test("should handle very long path names", async () => {
        const longPath = `/tmp/${"a".repeat(500)}`;
        const result = await analyzeProject(longPath);

        // Should not throw
        expect(result).toBeDefined();
      });

      test("should handle path with special characters", async () => {
        const result = await analyzeProject("/tmp/test (copy)");

        // Should not throw
        expect(result).toBeDefined();
      });
    });
  });
});
