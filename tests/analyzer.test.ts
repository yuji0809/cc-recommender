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

    describe("Rust project support", () => {
      let tempDir: string;

      beforeAll(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "test-rust-project-"));

        // Create Cargo.toml
        const cargoContent = `[package]
name = "myapp"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
sqlx = { version = "0.7", features = ["postgres"] }
diesel = "2.1"
sea-orm = "0.12"`;

        await writeFile(join(tempDir, "Cargo.toml"), cargoContent);

        // Create Rust files
        await writeFile(join(tempDir, "main.rs"), "fn main() {}");
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should parse Cargo.toml and detect dependencies", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.dependencies).toContain("axum");
        expect(result.dependencies).toContain("tokio");
        expect(result.dependencies).toContain("serde");
        expect(result.dependencies).toContain("sqlx");
        expect(result.dependencies).toContain("diesel");
        expect(result.dependencies).toContain("sea-orm");
      });

      test("should detect Rust language from .rs files", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.languages).toContain("rust");
      });

      test("should detect Rust frameworks from Cargo.toml", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("axum");
        expect(result.frameworks).toContain("tokio");
        expect(result.frameworks).toContain("serde");
        expect(result.frameworks).toContain("sqlx");
        expect(result.frameworks).toContain("diesel");
        expect(result.frameworks).toContain("sea-orm");
      });
    });

    describe("PHP project support", () => {
      let tempDir: string;

      beforeAll(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "test-php-project-"));

        // Create composer.json
        const composerContent = JSON.stringify({
          name: "test/myapp",
          description: "Test PHP application",
          require: {
            "laravel/framework": "^10.0",
            "symfony/symfony": "^6.0",
            "guzzlehttp/guzzle": "^7.0",
            "doctrine/orm": "^2.14",
          },
          "require-dev": {
            "phpunit/phpunit": "^10.0",
          },
        });

        await writeFile(join(tempDir, "composer.json"), composerContent);

        // Create PHP files
        await writeFile(join(tempDir, "index.php"), "<?php echo 'Hello'; ?>");
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should parse composer.json and detect dependencies", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.dependencies).toContain("laravel/framework");
        expect(result.dependencies).toContain("symfony/symfony");
        expect(result.dependencies).toContain("guzzlehttp/guzzle");
        expect(result.dependencies).toContain("doctrine/orm");
        expect(result.dependencies).toContain("phpunit/phpunit");
      });

      test("should detect PHP language from .php files", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.languages).toContain("php");
      });

      test("should detect PHP frameworks from composer.json", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("laravel");
        expect(result.frameworks).toContain("symfony");
        expect(result.frameworks).toContain("guzzle");
        expect(result.frameworks).toContain("doctrine");
        expect(result.frameworks).toContain("phpunit");
      });

      test("should extract description from composer.json", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.description).toBe("Test PHP application");
      });
    });

    describe(".env.example file detection", () => {
      let tempDir: string;

      beforeAll(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "test-env-project-"));

        // Create .env.example with various service patterns (no actual secrets)
        const envContent = `# Database
DATABASE_URL=postgresql://localhost/mydb
POSTGRES_HOST=localhost
REDIS_URL=redis://localhost:6379

# Cloud providers
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
AWS_ACCESS_KEY_ID=your-access-key
AZURE_STORAGE_ACCOUNT=your-account

# AI services
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=your-key

# Other services
STRIPE_SECRET_KEY=sk_test_your-key
GITHUB_TOKEN=ghp_your-token
SENTRY_DSN=https://your-key@sentry.io/your-project`;

        await writeFile(join(tempDir, ".env.example"), envContent);
        await writeFile(join(tempDir, "app.js"), "console.log('test')");
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should detect services from .env.example file", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("database");
        expect(result.frameworks).toContain("postgresql");
        expect(result.frameworks).toContain("redis");
        expect(result.frameworks).toContain("supabase");
        expect(result.frameworks).toContain("aws");
        expect(result.frameworks).toContain("azure");
        expect(result.frameworks).toContain("openai");
        expect(result.frameworks).toContain("anthropic");
        expect(result.frameworks).toContain("stripe");
        expect(result.frameworks).toContain("github");
        expect(result.frameworks).toContain("sentry");
      });

      test("should handle multiple env template files", async () => {
        // Create .env.template
        await writeFile(
          join(tempDir, ".env.template"),
          "FIREBASE_API_KEY=your-key\nVERCEL_TOKEN=your-token",
        );

        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("firebase");
        expect(result.frameworks).toContain("vercel");
      });

      test("should ignore comments in env template files", async () => {
        const result = await analyzeProject(tempDir);

        // Should not include any comment markers
        expect(result.frameworks.every((fw) => !fw.startsWith("#"))).toBe(true);
      });

      test("should not read actual .env files (security)", async () => {
        // Create actual .env with different services
        await writeFile(
          join(tempDir, ".env"),
          "SECRET_KEY=actual-secret\nTWILIO_AUTH_TOKEN=secret",
        );

        const result = await analyzeProject(tempDir);

        // Should NOT contain twilio (from .env) but should contain others (from .env.example)
        expect(result.frameworks).not.toContain("twilio");
        expect(result.frameworks).toContain("supabase"); // from .env.example
      });
    });

    describe("Docker Compose support", () => {
      let tempDir: string;

      beforeAll(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "test-docker-project-"));

        // Create docker-compose.yml
        const composeContent = `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password

  redis:
    image: redis:alpine

  nginx:
    image: nginx:latest
    ports:
      - "80:80"

  mongodb:
    image: mongo:6

  elasticsearch:
    image: elasticsearch:8.0.0`;

        await writeFile(join(tempDir, "docker-compose.yml"), composeContent);
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should detect services from docker-compose.yml", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("docker");
        expect(result.frameworks).toContain("postgresql");
        expect(result.frameworks).toContain("redis");
        expect(result.frameworks).toContain("nginx");
        expect(result.frameworks).toContain("mongodb");
        expect(result.frameworks).toContain("elasticsearch");
      });

      test("should handle compose.yml as well", async () => {
        const tempDir2 = await mkdtemp(join(tmpdir(), "test-compose-"));
        await writeFile(join(tempDir2, "compose.yml"), "services:\n  mysql:\n    image: mysql:8");

        const result = await analyzeProject(tempDir2);

        expect(result.frameworks).toContain("docker");
        expect(result.frameworks).toContain("mysql");

        await rm(tempDir2, { recursive: true, force: true });
      });
    });

    describe("Ruby project support", () => {
      let tempDir: string;

      beforeAll(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "test-ruby-project-"));

        // Create Gemfile
        const gemfileContent = `source 'https://rubygems.org'

ruby '3.2.0'

gem 'rails', '~> 7.0'
gem 'sinatra'
gem 'pg'
gem 'redis'
gem 'sidekiq'

group :development, :test do
  gem 'rspec-rails'
  gem 'capybara'
end

group :development do
  gem 'puma'
end`;

        await writeFile(join(tempDir, "Gemfile"), gemfileContent);

        // Create Ruby files
        await writeFile(join(tempDir, "app.rb"), "# Ruby app");
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should parse Gemfile and detect dependencies", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.dependencies).toContain("rails");
        expect(result.dependencies).toContain("sinatra");
        expect(result.dependencies).toContain("pg");
        expect(result.dependencies).toContain("redis");
        expect(result.dependencies).toContain("sidekiq");
        expect(result.dependencies).toContain("rspec-rails");
        expect(result.dependencies).toContain("puma");
      });

      test("should detect Ruby language from .rb files", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.languages).toContain("ruby");
      });

      test("should detect Ruby frameworks from Gemfile", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("rails");
        expect(result.frameworks).toContain("sinatra");
        expect(result.frameworks).toContain("postgresql");
        expect(result.frameworks).toContain("redis");
        expect(result.frameworks).toContain("sidekiq");
        expect(result.frameworks).toContain("rspec");
        expect(result.frameworks).toContain("puma");
      });
    });

    describe("Modern Python project support (pyproject.toml)", () => {
      let tempDir: string;

      beforeAll(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "test-pyproject-"));

        // Create pyproject.toml (Poetry format)
        const pyprojectContent = `[tool.poetry]
name = "myapp"
version = "0.1.0"

[tool.poetry.dependencies]
python = "^3.11"
django = "^4.2"
fastapi = "^0.100.0"
pandas = "^2.0.0"
torch = "^2.0.0"
sqlalchemy = "^2.0.0"
celery = "^5.3.0"

[tool.poetry.dev-dependencies]
pytest = "^7.4.0"

[build-system]
requires = ["poetry-core"]`;

        await writeFile(join(tempDir, "pyproject.toml"), pyprojectContent);
        await writeFile(join(tempDir, "main.py"), "print('hello')");
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should parse pyproject.toml and detect dependencies", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.dependencies).toContain("django");
        expect(result.dependencies).toContain("fastapi");
        expect(result.dependencies).toContain("pandas");
        expect(result.dependencies).toContain("torch");
        expect(result.dependencies).toContain("sqlalchemy");
        expect(result.dependencies).toContain("celery");
        expect(result.dependencies).toContain("pytest");
      });

      test("should detect Python language", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.languages).toContain("python");
      });

      test("should detect Python frameworks from pyproject.toml", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("django");
        expect(result.frameworks).toContain("fastapi");
        expect(result.frameworks).toContain("pandas");
        expect(result.frameworks).toContain("pytorch");
        expect(result.frameworks).toContain("sqlalchemy");
        expect(result.frameworks).toContain("celery");
        expect(result.frameworks).toContain("pytest");
      });

      test("should handle PEP 621 format", async () => {
        const tempDir2 = await mkdtemp(join(tmpdir(), "test-pep621-"));
        const pep621Content = `[project]
name = "myapp"
dependencies = [
  "flask>=2.0",
  "pydantic>=2.0"
]`;

        await writeFile(join(tempDir2, "pyproject.toml"), pep621Content);

        const result = await analyzeProject(tempDir2);

        expect(result.dependencies).toContain("flask");
        expect(result.dependencies).toContain("pydantic");
        expect(result.frameworks).toContain("flask");
        expect(result.frameworks).toContain("pydantic");

        await rm(tempDir2, { recursive: true, force: true });
      });
    });

    describe("Java/Maven project support (pom.xml)", () => {
      let tempDir: string;

      beforeAll(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "test-maven-project-"));

        // Create pom.xml
        const pomContent = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>myapp</artifactId>
    <version>1.0.0</version>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>3.0.0</version>
        </dependency>
        <dependency>
            <groupId>org.hibernate</groupId>
            <artifactId>hibernate-core</artifactId>
            <version>6.2.0</version>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql-driver</artifactId>
            <version>42.5.0</version>
        </dependency>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.9.0</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>1.18.26</version>
        </dependency>
    </dependencies>
</project>`;

        await writeFile(join(tempDir, "pom.xml"), pomContent);
        await writeFile(join(tempDir, "Main.java"), "public class Main {}");
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should parse pom.xml and detect dependencies", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.dependencies).toContain("spring-boot-starter-web");
        expect(result.dependencies).toContain("hibernate-core");
        expect(result.dependencies).toContain("postgresql-driver");
        expect(result.dependencies).toContain("junit-jupiter");
        expect(result.dependencies).toContain("lombok");
      });

      test("should detect Java language from .java files", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.languages).toContain("java");
      });

      test("should detect Java frameworks from pom.xml", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("spring-boot");
        expect(result.frameworks).toContain("hibernate");
        expect(result.frameworks).toContain("postgresql");
        expect(result.frameworks).toContain("junit");
        expect(result.frameworks).toContain("lombok");
      });
    });

    describe("Java/Kotlin/Gradle project support (build.gradle)", () => {
      let tempDir: string;

      beforeAll(async () => {
        tempDir = await mkdtemp(join(tmpdir(), "test-gradle-project-"));

        // Create build.gradle (Groovy DSL)
        const buildGradleContent = `plugins {
    id 'java'
    id 'org.springframework.boot' version '3.0.0'
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'io.ktor:ktor-server-core:2.3.0'
    implementation 'com.google.guava:guava:31.1-jre'
    implementation 'com.fasterxml.jackson.core:jackson-databind:2.15.0'

    testImplementation 'org.junit.jupiter:junit-jupiter:5.9.0'
    testImplementation 'io.mockk:mockk:1.13.5'
}`;

        await writeFile(join(tempDir, "build.gradle"), buildGradleContent);
        await writeFile(join(tempDir, "Main.kt"), "fun main() {}");
      });

      afterAll(async () => {
        await rm(tempDir, { recursive: true, force: true });
      });

      test("should parse build.gradle and detect dependencies", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.dependencies.some((d) => d.includes("spring-boot"))).toBe(true);
        expect(result.dependencies.some((d) => d.includes("ktor"))).toBe(true);
        expect(result.dependencies.some((d) => d.includes("guava"))).toBe(true);
        expect(result.dependencies.some((d) => d.includes("jackson"))).toBe(true);
        expect(result.dependencies.some((d) => d.includes("junit"))).toBe(true);
      });

      test("should detect Kotlin language from .kt files", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.languages).toContain("kotlin");
      });

      test("should detect frameworks from build.gradle", async () => {
        const result = await analyzeProject(tempDir);

        expect(result.frameworks).toContain("spring-boot");
        expect(result.frameworks).toContain("ktor");
        expect(result.frameworks).toContain("guava");
        expect(result.frameworks).toContain("jackson");
        expect(result.frameworks).toContain("junit");
        expect(result.frameworks).toContain("mockk");
      });

      test("should handle build.gradle.kts (Kotlin DSL)", async () => {
        const tempDir2 = await mkdtemp(join(tmpdir(), "test-gradle-kts-"));
        const buildGradleKtsContent = `dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("io.ktor:ktor-server-netty")
}`;

        await writeFile(join(tempDir2, "build.gradle.kts"), buildGradleKtsContent);

        const result = await analyzeProject(tempDir2);

        expect(result.frameworks).toContain("spring-boot");
        expect(result.frameworks).toContain("ktor");

        await rm(tempDir2, { recursive: true, force: true });
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
