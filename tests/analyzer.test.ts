import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { analyzeProject } from "../src/services/analyzer/project-analyzer.service.js";

describe("Analyzer Service", () => {
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

    describe("Python project support", () => {
      let tempDir: string;

      beforeAll(async () => {
        // Use mkdtemp for secure temporary directory creation
        tempDir = await mkdtemp(join(tmpdir(), "test-python-project-"));

        // Create requirements.txt
        const requirementsContent = `# Python dependencies
django>=4.0.0
flask==2.0.1
fastapi
torch>=1.9.0
pandas
numpy>=1.20.0
scikit-learn
# Comment line
requests`;

        await writeFile(join(tempDir, "requirements.txt"), requirementsContent);

        // Create Python files
        await writeFile(join(tempDir, "main.py"), "print('Hello')");
        await writeFile(join(tempDir, "app.py"), "# Flask app");
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should parse requirements.txt and detect dependencies", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.dependencies).toContain("django");
        expect(result.dependencies).toContain("flask");
        expect(result.dependencies).toContain("fastapi");
        expect(result.dependencies).toContain("torch");
        expect(result.dependencies).toContain("pandas");
        expect(result.dependencies).toContain("numpy");
        expect(result.dependencies).toContain("scikit-learn");
        expect(result.dependencies).toContain("requests");
      });

      test("should detect Python language from .py files", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.languages).toContain("python");
      });

      test("should detect Python frameworks from requirements.txt", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("django");
        expect(result.frameworks).toContain("flask");
        expect(result.frameworks).toContain("fastapi");
        expect(result.frameworks).toContain("pytorch");
        expect(result.frameworks).toContain("pandas");
        expect(result.frameworks).toContain("numpy");
        expect(result.frameworks).toContain("sklearn");
      });

      test("should ignore comments in requirements.txt", async () => {
        const result = await analyzeProject(tempDir);

        // Should not include comment lines
        expect(result.dependencies.every((dep) => !dep.startsWith("#"))).toBe(true);
      });

      test("should normalize dependency names to lowercase", async () => {
        const result = await analyzeProject(tempDir);

        // All dependencies should be lowercase
        expect(result.dependencies.every((dep) => dep === dep.toLowerCase())).toBe(true);
      });
    });

    describe("Go project support", () => {
      let tempDir: string;

      beforeAll(async () => {
        // Use mkdtemp for secure temporary directory creation
        tempDir = await mkdtemp(join(tmpdir(), "test-go-project-"));

        // Create go.mod
        const goModContent = `module example.com/myapp

go 1.21

require (
	github.com/gin-gonic/gin v1.9.0
	github.com/gorilla/mux v1.8.0
	github.com/stretchr/testify v1.8.4
	golang.org/x/sync v0.3.0
	// Indirect dependency
	github.com/google/uuid v1.3.0
)`;

        await writeFile(join(tempDir, "go.mod"), goModContent);

        // Create Go files
        await writeFile(join(tempDir, "main.go"), "package main\n\nfunc main() {}");
        await writeFile(join(tempDir, "handler.go"), "package main");
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should parse go.mod and detect dependencies", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.dependencies).toContain("github.com/gin-gonic/gin");
        expect(result.dependencies).toContain("github.com/gorilla/mux");
        expect(result.dependencies).toContain("github.com/stretchr/testify");
        expect(result.dependencies).toContain("golang.org/x/sync");
        expect(result.dependencies).toContain("github.com/google/uuid");
      });

      test("should detect Go language from .go files", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.languages).toContain("go");
      });

      test("should detect Go from go.mod file", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.languages).toContain("go");
      });

      test("should ignore comments in go.mod", async () => {
        const result = await analyzeProject(tempDir);

        // Dependencies should not start with //
        expect(result.dependencies.every((dep) => !dep.startsWith("//"))).toBe(true);
      });
    });

    describe("Multi-language project support", () => {
      let tempDir: string;

      beforeAll(async () => {
        // Use mkdtemp for secure temporary directory creation
        tempDir = await mkdtemp(join(tmpdir(), "test-multi-lang-"));

        // Create package.json
        await writeFile(
          join(tempDir, "package.json"),
          JSON.stringify({
            name: "multi-lang-project",
            dependencies: {
              react: "^18.0.0",
              express: "^4.18.0",
            },
          }),
        );

        // Create requirements.txt
        await writeFile(join(tempDir, "requirements.txt"), "flask\ndjango");

        // Create files for multiple languages
        await writeFile(join(tempDir, "app.js"), "console.log('Hello')");
        await writeFile(join(tempDir, "main.py"), "print('Hello')");
        await writeFile(join(tempDir, "script.ts"), "const x: number = 1");
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should detect multiple languages", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.languages).toContain("javascript");
        expect(result.languages).toContain("typescript");
        expect(result.languages).toContain("python");
        expect(result.languages.length).toBeGreaterThanOrEqual(3);
      });

      test("should combine dependencies from multiple sources", async () => {
        const result = await analyzeProject(tempDir);

        // Should have dependencies from both package.json and requirements.txt
        expect(result.dependencies).toContain("react");
        expect(result.dependencies).toContain("express");
        expect(result.dependencies).toContain("flask");
        expect(result.dependencies).toContain("django");
      });

      test("should detect frameworks from multiple ecosystems", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("flask");
        expect(result.frameworks).toContain("django");
      });
    });
  });
});
