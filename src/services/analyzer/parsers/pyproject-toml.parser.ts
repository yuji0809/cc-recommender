/**
 * pyproject.toml Parser
 *
 * Parses Python pyproject.toml files for dependencies and frameworks
 * (Modern Python packaging with Poetry, PDM, Hatch, etc.)
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/** Framework detection mappings for Python dependencies */
const FRAMEWORK_MAPPINGS: Record<string, string> = {
  django: "django",
  flask: "flask",
  fastapi: "fastapi",
  starlette: "starlette",
  pytorch: "pytorch",
  torch: "pytorch",
  tensorflow: "tensorflow",
  pandas: "pandas",
  numpy: "numpy",
  "scikit-learn": "sklearn",
  sklearn: "sklearn",
  pydantic: "pydantic",
  sqlalchemy: "sqlalchemy",
  celery: "celery",
  pytest: "pytest",
  streamlit: "streamlit",
  gradio: "gradio",
};

/**
 * Parse pyproject.toml and extract dependencies and frameworks
 */
export async function parsePyprojectToml(projectPath: string, info: ProjectInfo): Promise<void> {
  try {
    const pyprojectPath = join(projectPath, "pyproject.toml");
    const content = await readFile(pyprojectPath, "utf-8");

    // Extract dependencies from [tool.poetry.dependencies], [project.dependencies], etc.
    const deps: string[] = [];

    // Poetry format: [tool.poetry.dependencies]
    const poetryMatch = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\n\[|$)/);
    if (poetryMatch) {
      const poetryDeps = poetryMatch[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line !== "python")
        .map((line) => {
          const match = line.match(/^([a-zA-Z0-9_-]+)/);
          return match ? match[1].toLowerCase() : null;
        })
        .filter((dep): dep is string => dep !== null);
      deps.push(...poetryDeps);
    }

    // Poetry dev dependencies: [tool.poetry.dev-dependencies]
    const poetryDevMatch = content.match(/\[tool\.poetry\.dev-dependencies\]([\s\S]*?)(?=\n\[|$)/);
    if (poetryDevMatch) {
      const poetryDevDeps = poetryDevMatch[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const match = line.match(/^([a-zA-Z0-9_-]+)/);
          return match ? match[1].toLowerCase() : null;
        })
        .filter((dep): dep is string => dep !== null);
      deps.push(...poetryDevDeps);
    }

    // PEP 621 format: [project.dependencies]
    const projectMatch = content.match(/\[project\.dependencies\]([\s\S]*?)(?=\n\[|$)/);
    if (!projectMatch) {
      // Try inline array format: dependencies = ["package1", "package2"]
      const inlineMatch = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
      if (inlineMatch) {
        const inlineDeps = inlineMatch[1]
          .split(",")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#"))
          .map((line) => {
            const match = line.match(/['"]([a-zA-Z0-9_-]+)/);
            return match ? match[1].toLowerCase() : null;
          })
          .filter((dep): dep is string => dep !== null);
        deps.push(...inlineDeps);
      }
    } else {
      const projectDeps = projectMatch[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const match = line.match(/^['"]?([a-zA-Z0-9_-]+)/);
          return match ? match[1].toLowerCase() : null;
        })
        .filter((dep): dep is string => dep !== null);
      deps.push(...projectDeps);
    }

    info.dependencies.push(...deps);

    // Detect Python frameworks
    for (const [dep, framework] of Object.entries(FRAMEWORK_MAPPINGS)) {
      if (deps.includes(dep)) {
        info.frameworks.push(framework);
      }
    }
  } catch {
    // No pyproject.toml
  }
}
