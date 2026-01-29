/**
 * Requirements.txt Parser
 *
 * Parses Python requirements.txt files for dependencies and frameworks
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/** Framework detection mappings for Python dependencies */
const FRAMEWORK_MAPPINGS: Record<string, string> = {
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

/**
 * Parse requirements.txt and extract dependencies and frameworks
 */
export async function parseRequirementsTxt(projectPath: string, info: ProjectInfo): Promise<void> {
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
    for (const [dep, framework] of Object.entries(FRAMEWORK_MAPPINGS)) {
      if (deps.includes(dep)) {
        info.frameworks.push(framework);
      }
    }
  } catch {
    // No requirements.txt
  }
}
