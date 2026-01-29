/**
 * Project Analyzer Service
 *
 * Main service for analyzing project structure and extracting information
 */

import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { FILE_SCAN_CONFIG, SKIP_DIRECTORIES } from "../../config/constants.js";
import { CONFIG_FILE_MAPPINGS, EXTENSION_TO_LANGUAGE } from "../../config/file-mappings.js";
import type { ProjectInfo } from "../../types/service-types.js";
import { parseGoMod } from "./parsers/go-mod.parser.js";
import { parsePackageJson } from "./parsers/package-json.parser.js";
import { parseRequirementsTxt } from "./parsers/requirements-txt.parser.js";

/**
 * Analyze a project directory and extract information
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

    // Parse dependency files
    await parsePackageJson(projectPath, info);
    await parseRequirementsTxt(projectPath, info);
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
 * Recursively scan directory for files and detect languages/frameworks
 */
async function scanDirectory(dirPath: string, info: ProjectInfo, depth: number): Promise<void> {
  // Limit recursion depth
  if (depth > FILE_SCAN_CONFIG.maxDepth) return;

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
        // Add file to list (limit to max files)
        if (info.files.length < FILE_SCAN_CONFIG.maxFiles) {
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
 * Check if directory should be skipped during scanning
 */
function shouldSkipDirectory(name: string): boolean {
  return SKIP_DIRECTORIES.includes(name as never) || name.startsWith(".");
}
