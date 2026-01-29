/**
 * Project Analyzer
 *
 * Analyzes project structure to extract useful information
 * for making recommendations
 */

import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { ProjectInfo } from "../types/index.js";

/** Common config files and their frameworks */
const CONFIG_FILE_MAPPINGS: Record<string, { framework?: string; language?: string }> = {
  "package.json": { language: "javascript" },
  "tsconfig.json": { language: "typescript" },
  "next.config.js": { framework: "nextjs" },
  "next.config.mjs": { framework: "nextjs" },
  "next.config.ts": { framework: "nextjs" },
  "nuxt.config.ts": { framework: "nuxt" },
  "nuxt.config.js": { framework: "nuxt" },
  "vite.config.ts": { framework: "vite" },
  "vite.config.js": { framework: "vite" },
  "svelte.config.js": { framework: "svelte" },
  "angular.json": { framework: "angular" },
  "vue.config.js": { framework: "vue" },
  "remix.config.js": { framework: "remix" },
  "astro.config.mjs": { framework: "astro" },
  "requirements.txt": { language: "python" },
  "pyproject.toml": { language: "python" },
  "setup.py": { language: "python" },
  "Cargo.toml": { language: "rust" },
  "go.mod": { language: "go" },
  Gemfile: { language: "ruby" },
  "composer.json": { language: "php" },
  "pom.xml": { language: "java" },
  "build.gradle": { language: "java" },
  "build.gradle.kts": { language: "kotlin" },
  ".csproj": { language: "csharp" },
  Dockerfile: { framework: "docker" },
  "docker-compose.yml": { framework: "docker" },
  "docker-compose.yaml": { framework: "docker" },
  "kubernetes.yml": { framework: "kubernetes" },
  "k8s.yml": { framework: "kubernetes" },
  ".github/workflows": { framework: "github-actions" },
  "vercel.json": { framework: "vercel" },
  "netlify.toml": { framework: "netlify" },
  "prisma/schema.prisma": { framework: "prisma" },
  "drizzle.config.ts": { framework: "drizzle" },
  "CLAUDE.md": { framework: "claude-code" },
  ".claude": { framework: "claude-code" },
};

/** Extension to language mappings */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
  ".rb": "ruby",
  ".php": "php",
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".cs": "csharp",
  ".swift": "swift",
  ".lua": "lua",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
};

/**
 * Analyze a project directory
 */
export async function analyzeProject(projectPath: string): Promise<ProjectInfo> {
  const info: ProjectInfo = {
    path: projectPath,
    languages: [],
    dependencies: [],
    files: [],
    frameworks: [],
  };

  try {
    // Scan files
    await scanDirectory(projectPath, info, 0);

    // Parse package.json for dependencies
    await parsePackageJson(projectPath, info);

    // Parse requirements.txt
    await parseRequirementsTxt(projectPath, info);

    // Parse go.mod
    await parseGoMod(projectPath, info);

    // Deduplicate
    info.languages = [...new Set(info.languages)];
    info.dependencies = [...new Set(info.dependencies)];
    info.frameworks = [...new Set(info.frameworks)];
  } catch (error) {
    console.error("Error analyzing project:", error);
  }

  return info;
}

/**
 * Recursively scan directory
 */
async function scanDirectory(dirPath: string, info: ProjectInfo, depth: number): Promise<void> {
  // Limit recursion depth
  if (depth > 5) return;

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const relativePath = fullPath.replace(`${info.path}/`, "");

      // Skip common ignored directories
      if (shouldSkipDirectory(entry.name)) continue;

      if (entry.isDirectory()) {
        // Check for config directories
        const mapping = CONFIG_FILE_MAPPINGS[entry.name];
        if (mapping) {
          if (mapping.framework) info.frameworks.push(mapping.framework);
          if (mapping.language) info.languages.push(mapping.language);
        }

        // Recurse
        await scanDirectory(fullPath, info, depth + 1);
      } else {
        // Add file to list (limit to 1000 files)
        if (info.files.length < 1000) {
          info.files.push(relativePath);
        }

        // Check config files
        const configKey = Object.keys(CONFIG_FILE_MAPPINGS).find(
          (key) => relativePath === key || relativePath.endsWith(`/${key}`),
        );
        if (configKey) {
          const mapping = CONFIG_FILE_MAPPINGS[configKey];
          if (mapping.framework) info.frameworks.push(mapping.framework);
          if (mapping.language) info.languages.push(mapping.language);
        }

        // Detect language from extension
        const ext = extname(entry.name).toLowerCase();
        const lang = EXTENSION_TO_LANGUAGE[ext];
        if (lang) {
          info.languages.push(lang);
        }
      }
    }
  } catch {
    // Directory might not be readable
  }
}

/**
 * Check if directory should be skipped
 */
function shouldSkipDirectory(name: string): boolean {
  const skipDirs = [
    "node_modules",
    ".git",
    ".next",
    ".nuxt",
    "dist",
    "build",
    "out",
    ".cache",
    "__pycache__",
    ".venv",
    "venv",
    "vendor",
    "target",
    ".idea",
    ".vscode",
    "coverage",
  ];

  return skipDirs.includes(name) || name.startsWith(".");
}

/**
 * Parse package.json for dependencies
 */
async function parsePackageJson(projectPath: string, info: ProjectInfo): Promise<void> {
  try {
    const packageJsonPath = join(projectPath, "package.json");
    const content = await readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);

    // Add name/description
    if (pkg.description) {
      info.description = pkg.description;
    }

    // Collect dependencies
    const allDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
    ];

    info.dependencies.push(...allDeps);

    // Detect frameworks from dependencies
    const frameworkDeps: Record<string, string> = {
      next: "nextjs",
      react: "react",
      vue: "vue",
      "@angular/core": "angular",
      svelte: "svelte",
      "@remix-run/react": "remix",
      astro: "astro",
      express: "express",
      fastify: "fastify",
      koa: "koa",
      nestjs: "nestjs",
      "@nestjs/core": "nestjs",
      prisma: "prisma",
      "@prisma/client": "prisma",
      "drizzle-orm": "drizzle",
      typeorm: "typeorm",
      mongoose: "mongoose",
      tailwindcss: "tailwind",
      "@supabase/supabase-js": "supabase",
      firebase: "firebase",
    };

    for (const [dep, framework] of Object.entries(frameworkDeps)) {
      if (allDeps.includes(dep)) {
        info.frameworks.push(framework);
      }
    }
  } catch {
    // No package.json or parse error
  }
}

/**
 * Parse requirements.txt for Python dependencies
 */
async function parseRequirementsTxt(projectPath: string, info: ProjectInfo): Promise<void> {
  try {
    const reqPath = join(projectPath, "requirements.txt");
    const content = await readFile(reqPath, "utf-8");

    const deps = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        // Remove version specifiers
        const match = line.match(/^([a-zA-Z0-9_-]+)/);
        return match ? match[1].toLowerCase() : null;
      })
      .filter((dep): dep is string => dep !== null);

    info.dependencies.push(...deps);

    // Detect Python frameworks
    const frameworkDeps: Record<string, string> = {
      django: "django",
      flask: "flask",
      fastapi: "fastapi",
      pytorch: "pytorch",
      torch: "pytorch",
      tensorflow: "tensorflow",
      pandas: "pandas",
      numpy: "numpy",
      "scikit-learn": "sklearn",
    };

    for (const [dep, framework] of Object.entries(frameworkDeps)) {
      if (deps.includes(dep)) {
        info.frameworks.push(framework);
      }
    }
  } catch {
    // No requirements.txt
  }
}

/**
 * Parse go.mod for Go dependencies
 */
async function parseGoMod(projectPath: string, info: ProjectInfo): Promise<void> {
  try {
    const goModPath = join(projectPath, "go.mod");
    const content = await readFile(goModPath, "utf-8");

    // Extract require statements
    const requireMatch = content.match(/require\s*\(([\s\S]*?)\)/);
    if (requireMatch) {
      const deps = requireMatch[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("//"))
        .map((line) => {
          const match = line.match(/^([^\s]+)/);
          return match ? match[1] : null;
        })
        .filter((dep): dep is string => dep !== null);

      info.dependencies.push(...deps);
    }
  } catch {
    // No go.mod
  }
}
