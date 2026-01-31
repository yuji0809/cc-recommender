/**
 * pom.xml Parser
 *
 * Parses Maven pom.xml files for dependencies and frameworks
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/** Framework detection mappings for Java/Maven dependencies */
const FRAMEWORK_MAPPINGS: Record<string, string> = {
  "spring-boot": "spring-boot",
  "spring-framework": "spring",
  "spring-web": "spring",
  "spring-webmvc": "spring",
  hibernate: "hibernate",
  "hibernate-core": "hibernate",
  junit: "junit",
  "junit-jupiter": "junit",
  mockito: "mockito",
  "mockito-core": "mockito",
  lombok: "lombok",
  guava: "guava",
  jackson: "jackson",
  "jackson-databind": "jackson",
  "postgresql-driver": "postgresql",
  "mysql-connector": "mysql",
  h2: "h2",
  kafka: "kafka",
  "kafka-clients": "kafka",
  "spring-kafka": "kafka",
  redis: "redis",
  jedis: "redis",
  lettuce: "redis",
  mongodb: "mongodb",
  "mongodb-driver": "mongodb",
};

/**
 * Parse pom.xml and extract dependencies and frameworks
 */
export async function parsePomXml(projectPath: string, info: ProjectInfo): Promise<void> {
  try {
    const pomPath = join(projectPath, "pom.xml");
    const content = await readFile(pomPath, "utf-8");

    // Extract dependencies from <dependency> tags
    const dependencyPattern = /<dependency>[\s\S]*?<\/dependency>/g;
    const dependencies = content.match(dependencyPattern) || [];

    for (const dep of dependencies) {
      // Extract artifactId
      const artifactMatch = dep.match(/<artifactId>([^<]+)<\/artifactId>/);
      if (artifactMatch) {
        const artifactId = artifactMatch[1].toLowerCase();
        info.dependencies.push(artifactId);

        // Check if this dependency matches known frameworks
        for (const [pattern, framework] of Object.entries(FRAMEWORK_MAPPINGS)) {
          if (artifactId.includes(pattern)) {
            info.frameworks.push(framework);
            break;
          }
        }
      }
    }
  } catch {
    // No pom.xml
  }
}
