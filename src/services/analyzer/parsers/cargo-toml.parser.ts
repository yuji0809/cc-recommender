/**
 * Cargo.toml Parser
 *
 * Parses Rust Cargo.toml files for dependencies and frameworks
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/** Framework detection mappings for Rust dependencies */
const FRAMEWORK_MAPPINGS: Record<string, string> = {
  axum: "axum",
  "actix-web": "actix-web",
  rocket: "rocket",
  tokio: "tokio",
  "async-std": "async-std",
  serde: "serde",
  sqlx: "sqlx",
  diesel: "diesel",
  "sea-orm": "sea-orm",
  tauri: "tauri",
  leptos: "leptos",
  yew: "yew",
  bevy: "bevy",
};

/**
 * Parse Cargo.toml and extract dependencies and frameworks
 */
export async function parseCargoToml(projectPath: string, info: ProjectInfo): Promise<void> {
  try {
    const cargoPath = join(projectPath, "Cargo.toml");
    const content = await readFile(cargoPath, "utf-8");

    // Extract dependencies section
    const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?=\n\[|$)/);
    if (depsMatch) {
      const deps = depsMatch[1]
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const match = line.match(/^([a-zA-Z0-9_-]+)/);
          return match ? match[1].toLowerCase() : null;
        })
        .filter((dep): dep is string => dep !== null);

      info.dependencies.push(...deps);

      // Detect Rust frameworks
      for (const [dep, framework] of Object.entries(FRAMEWORK_MAPPINGS)) {
        if (deps.includes(dep)) {
          info.frameworks.push(framework);
        }
      }
    }
  } catch {
    // No Cargo.toml
  }
}
