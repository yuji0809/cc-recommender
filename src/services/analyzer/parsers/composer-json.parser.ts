/**
 * Composer.json Parser
 *
 * Parses PHP composer.json files for dependencies and frameworks
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/** Framework detection mappings for PHP dependencies */
const FRAMEWORK_MAPPINGS: Record<string, string> = {
  "laravel/framework": "laravel",
  "symfony/symfony": "symfony",
  "symfony/framework-bundle": "symfony",
  "codeigniter4/framework": "codeigniter",
  "cakephp/cakephp": "cakephp",
  "yiisoft/yii2": "yii",
  "slim/slim": "slim",
  wordpress: "wordpress",
  drupal: "drupal",
  "guzzlehttp/guzzle": "guzzle",
  "phpunit/phpunit": "phpunit",
  "doctrine/orm": "doctrine",
};

/**
 * Parse composer.json and extract dependencies and frameworks
 */
export async function parseComposerJson(projectPath: string, info: ProjectInfo): Promise<void> {
  try {
    const composerPath = join(projectPath, "composer.json");
    const content = await readFile(composerPath, "utf-8");
    const composer = JSON.parse(content);

    // Add description if available
    if (composer.description) {
      info.description = composer.description;
    }

    // Collect dependencies
    const allDeps = [
      ...Object.keys(composer.require || {}),
      ...Object.keys(composer["require-dev"] || {}),
    ];

    info.dependencies.push(...allDeps);

    // Detect frameworks from dependencies
    for (const [dep, framework] of Object.entries(FRAMEWORK_MAPPINGS)) {
      if (allDeps.includes(dep)) {
        info.frameworks.push(framework);
      }
    }
  } catch {
    // No composer.json or parse error
  }
}
