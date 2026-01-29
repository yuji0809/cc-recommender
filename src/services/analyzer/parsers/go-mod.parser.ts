/**
 * Go.mod Parser
 *
 * Parses Go go.mod files for dependencies
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/**
 * Parse go.mod and extract dependencies
 */
export async function parseGoMod(projectPath: string, info: ProjectInfo): Promise<void> {
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
