/**
 * Gemfile Parser
 *
 * Parses Ruby Gemfile for dependencies and frameworks
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/** Framework detection mappings for Ruby gems */
const FRAMEWORK_MAPPINGS: Record<string, string> = {
  rails: "rails",
  sinatra: "sinatra",
  hanami: "hanami",
  padrino: "padrino",
  grape: "grape",
  roda: "roda",
  rspec: "rspec",
  minitest: "minitest",
  capybara: "capybara",
  devise: "devise",
  activerecord: "activerecord",
  sequel: "sequel",
  sidekiq: "sidekiq",
  puma: "puma",
  unicorn: "unicorn",
  pg: "postgresql",
  mysql2: "mysql",
  redis: "redis",
  mongoid: "mongodb",
  elasticsearch: "elasticsearch",
};

/**
 * Parse Gemfile and extract dependencies and frameworks
 */
export async function parseGemfile(projectPath: string, info: ProjectInfo): Promise<void> {
  try {
    const gemfilePath = join(projectPath, "Gemfile");
    const content = await readFile(gemfilePath, "utf-8");

    const deps = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("gem ") && !line.startsWith("#"))
      .map((line) => {
        // Extract gem name from: gem 'name' or gem "name"
        const match = line.match(/gem\s+['"]([^'"]+)['"]/);
        return match ? match[1].toLowerCase() : null;
      })
      .filter((dep): dep is string => dep !== null);

    info.dependencies.push(...deps);

    // Detect Ruby frameworks
    for (const [dep, framework] of Object.entries(FRAMEWORK_MAPPINGS)) {
      // Check exact match or if any dependency starts with the gem name
      // (e.g., "rspec-rails" should match "rspec")
      if (deps.includes(dep) || deps.some((d) => d.startsWith(`${dep}-`))) {
        info.frameworks.push(framework);
      }
    }
  } catch {
    // No Gemfile
  }
}
