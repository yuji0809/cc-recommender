/**
 * Package.json Parser
 *
 * Parses Node.js package.json files for dependencies and frameworks
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/** Framework detection mappings for Node.js dependencies */
const FRAMEWORK_MAPPINGS: Record<string, string> = {
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

/**
 * Parse package.json and extract dependencies and frameworks
 */
export async function parsePackageJson(projectPath: string, info: ProjectInfo): Promise<void> {
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
    for (const [dep, framework] of Object.entries(FRAMEWORK_MAPPINGS)) {
      if (allDeps.includes(dep)) {
        info.frameworks.push(framework);
      }
    }
  } catch {
    // No package.json or parse error
  }
}
