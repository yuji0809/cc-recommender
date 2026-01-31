/**
 * build.gradle Parser
 *
 * Parses Gradle build.gradle files for dependencies and frameworks
 * Supports both Groovy and Kotlin DSL
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/** Framework detection mappings for Java/Kotlin/Gradle dependencies */
const FRAMEWORK_MAPPINGS: Record<string, string> = {
  "spring-boot": "spring-boot",
  "org.springframework.boot": "spring-boot",
  "spring-framework": "spring",
  "org.springframework": "spring",
  ktor: "ktor",
  "io.ktor": "ktor",
  hibernate: "hibernate",
  junit: "junit",
  "org.junit": "junit",
  mockito: "mockito",
  mockk: "mockk",
  lombok: "lombok",
  guava: "guava",
  "com.google.guava": "guava",
  jackson: "jackson",
  "com.fasterxml.jackson": "jackson",
  postgresql: "postgresql",
  mysql: "mysql",
  h2: "h2",
  kafka: "kafka",
  "org.apache.kafka": "kafka",
  redis: "redis",
  jedis: "redis",
  lettuce: "redis",
  mongodb: "mongodb",
  "org.mongodb": "mongodb",
  exposed: "exposed",
  "org.jetbrains.exposed": "exposed",
};

/**
 * Parse build.gradle and extract dependencies and frameworks
 */
export async function parseBuildGradle(projectPath: string, info: ProjectInfo): Promise<void> {
  const gradleFiles = ["build.gradle", "build.gradle.kts"];

  for (const gradleFile of gradleFiles) {
    try {
      const gradlePath = join(projectPath, gradleFile);
      const content = await readFile(gradlePath, "utf-8");

      // Extract dependencies from various declaration styles
      // Supports: implementation("..."), implementation '...', compile("..."), etc.
      const dependencyPatterns = [
        /(?:implementation|api|compile|testImplementation|runtimeOnly)\s*\(?['"]([^'"]+)['"]\)?/g,
        /(?:implementation|api|compile|testImplementation|runtimeOnly)\s*\([^)]*group\s*[:=]\s*['"]([^'"]+)['"][^)]*\)/g,
      ];

      for (const pattern of dependencyPatterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          const dependency = match[1].toLowerCase();
          info.dependencies.push(dependency);

          // Check if this dependency matches known frameworks
          for (const [frameworkPattern, framework] of Object.entries(FRAMEWORK_MAPPINGS)) {
            if (dependency.includes(frameworkPattern)) {
              info.frameworks.push(framework);
              break;
            }
          }
        }
      }

      // Only parse the first found file
      break;
    } catch {
      // File doesn't exist, continue to next
    }
  }
}
