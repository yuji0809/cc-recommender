/**
 * Docker Compose Parser
 *
 * Parses docker-compose.yml files to detect infrastructure services
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectInfo } from "../../../types/service-types.js";

/** Service detection mappings for Docker Compose services */
const SERVICE_MAPPINGS: Record<string, string> = {
  postgres: "postgresql",
  postgresql: "postgresql",
  mysql: "mysql",
  mariadb: "mysql",
  redis: "redis",
  mongodb: "mongodb",
  mongo: "mongodb",
  elasticsearch: "elasticsearch",
  nginx: "nginx",
  apache: "apache",
  rabbitmq: "rabbitmq",
  kafka: "kafka",
  memcached: "memcached",
  minio: "minio",
  grafana: "grafana",
  prometheus: "prometheus",
  jaeger: "jaeger",
  zipkin: "zipkin",
  consul: "consul",
  vault: "vault",
  traefik: "traefik",
  caddy: "caddy",
  mailhog: "mailhog",
  localstack: "aws",
  azurite: "azure",
};

/**
 * Parse docker-compose.yml and detect infrastructure services
 */
export async function parseDockerCompose(projectPath: string, info: ProjectInfo): Promise<void> {
  const composeFiles = ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"];

  for (const composeFile of composeFiles) {
    try {
      const composePath = join(projectPath, composeFile);
      const content = await readFile(composePath, "utf-8");

      // Extract service names from docker-compose
      // Look for "image:" lines to detect services
      const imageMatches = content.matchAll(/^\s*image:\s*([^\s:]+)/gm);

      for (const match of imageMatches) {
        const imageName = match[1].toLowerCase();

        // Check if image name matches known services
        for (const [pattern, service] of Object.entries(SERVICE_MAPPINGS)) {
          if (imageName.includes(pattern)) {
            info.frameworks.push(service);
            break;
          }
        }
      }

      // Also check service names directly
      const serviceMatches = content.matchAll(/^\s{2,4}([a-z0-9_-]+):/gm);

      for (const match of serviceMatches) {
        const serviceName = match[1].toLowerCase();

        // Skip common docker-compose keys
        if (["services", "networks", "volumes", "version"].includes(serviceName)) {
          continue;
        }

        // Check if service name matches known services
        if (SERVICE_MAPPINGS[serviceName]) {
          info.frameworks.push(SERVICE_MAPPINGS[serviceName]);
        }
      }

      // If we found a docker-compose file, add docker framework
      info.frameworks.push("docker");

      // Only parse the first found file
      break;
    } catch {
      // File doesn't exist, continue to next
    }
  }
}
