/**
 * Official MCP Registry Fetcher
 *
 * Fetches MCP servers from the official Model Context Protocol Registry
 * Source: https://registry.modelcontextprotocol.io
 */

import type { Recommendation } from "../../types/domain-types.js";

const REGISTRY_API = "https://registry.modelcontextprotocol.io/v0.1/servers";
const PAGE_LIMIT = 96; // Maximum allowed by API

type RegistryServer = {
  name: string;
  description: string;
  version: string;
  repository?: {
    url: string;
    source: string;
  };
  homepage?: string;
  packages?: Array<{
    registryType: "npm" | "pypi" | "oci";
    identifier: string;
    version?: string;
    transport?: {
      type: string;
    };
  }>;
  remotes?: Array<{
    type: string;
    url: string;
  }>;
  environmentVariables?: Array<{
    name: string;
    description?: string;
    format?: string;
    isSecret?: boolean;
  }>;
};

type RegistryEntry = {
  server: RegistryServer;
  _meta: {
    "io.modelcontextprotocol.registry/official": {
      status: "active" | "inactive";
      publishedAt: string;
      updatedAt: string;
      isLatest: boolean;
    };
  };
};

type RegistryResponse = {
  servers: RegistryEntry[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
};

/**
 * Fetch MCP servers from official registry
 */
export async function fetchOfficialMCPServers(): Promise<Recommendation[]> {
  console.log("🔌 Fetching MCP servers from official registry...");

  try {
    const allEntries: RegistryEntry[] = [];
    let cursor: string | undefined;
    let pageCount = 0;

    // Fetch all pages
    do {
      const url = new URL(REGISTRY_API);
      url.searchParams.set("version", "latest");
      url.searchParams.set("limit", PAGE_LIMIT.toString());
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as RegistryResponse;
      // Filter active servers only
      const activeEntries = data.servers.filter(
        (entry) => entry._meta["io.modelcontextprotocol.registry/official"].status === "active",
      );
      allEntries.push(...activeEntries);
      cursor = data.metadata.nextCursor;
      pageCount++;

      // Safety limit to prevent infinite loops
      if (pageCount > 100) {
        console.warn("   ⚠ Reached page limit (100), stopping pagination");
        break;
      }
    } while (cursor);

    const recommendations = allEntries
      .map(transformRegistryEntry)
      .filter((r): r is Recommendation => r !== null);

    console.log(`   ✓ Fetched ${recommendations.length} official MCP servers`);
    return recommendations;
  } catch (error) {
    console.error("   ✗ Failed to fetch official MCP servers:", error);
    return [];
  }
}

/**
 * Transform registry entry to unified Recommendation
 */
function transformRegistryEntry(entry: RegistryEntry): Recommendation | null {
  try {
    const server = entry.server;
    const meta = entry._meta["io.modelcontextprotocol.registry/official"];

    // Validate required fields
    if (!server.name || !server.description) {
      return null;
    }

    // Extract category from name (e.g., "company.name/category-server" -> "category")
    const nameParts = server.name.split("/");
    const serverName = nameParts[nameParts.length - 1];
    const category = inferCategory(serverName, server.description);

    // Determine installation command
    const installCommand = getInstallCommand(server);

    // Extract detection rules
    const detection = extractDetectionRules(server);

    // Determine source URL (prefer repository, fallback to registry)
    const url =
      server.repository?.url || server.homepage || `https://registry.modelcontextprotocol.io`;

    return {
      id: `official-mcp-${server.name.replace(/[^a-z0-9-]/gi, "-")}`,
      name: server.name,
      type: "mcp",
      url,
      description: server.description,
      author: {
        name: nameParts[0] || "Unknown",
      },
      category,
      tags: [category, "mcp", "official-registry"],
      detection,
      metrics: {
        source: "official",
        isOfficial: true,
        lastUpdated: meta.updatedAt,
      },
      install: {
        method: "mcp-add",
        command: installCommand,
        marketplace: "official-registry",
      },
    };
  } catch (error) {
    console.warn(
      `   ⚠ Failed to transform server: ${entry.server.name || "unknown"} -`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Infer category from server name and description
 */
function inferCategory(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
    database: ["database", "sql", "postgres", "mysql", "mongodb", "redis"],
    cloud: ["aws", "azure", "gcp", "cloud", "s3", "lambda"],
    "developer-tools": ["git", "github", "gitlab", "code", "dev"],
    communication: ["slack", "discord", "email", "notification"],
    search: ["search", "elasticsearch", "algolia"],
    filesystem: ["file", "filesystem", "storage"],
    productivity: ["notion", "calendar", "task", "todo"],
    security: ["security", "auth", "vault", "secret"],
    monitoring: ["monitor", "log", "metric", "observability"],
    ai: ["ai", "llm", "model", "inference"],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }

  return "other";
}

/**
 * Get installation command for server
 */
function getInstallCommand(server: RegistryServer): string | undefined {
  // NPM package
  if (server.packages?.some((p) => p.registryType === "npm")) {
    const npmPkg = server.packages.find((p) => p.registryType === "npm");
    if (npmPkg) {
      return `npx ${npmPkg.identifier}`;
    }
  }

  // PyPI package
  if (server.packages?.some((p) => p.registryType === "pypi")) {
    const pypiPkg = server.packages.find((p) => p.registryType === "pypi");
    if (pypiPkg) {
      return `uvx ${pypiPkg.identifier}`;
    }
  }

  // Fallback to registry name
  return `claude mcp add ${server.name}`;
}

/**
 * Extract detection rules from server metadata
 */
function extractDetectionRules(server: RegistryServer): Recommendation["detection"] {
  const rules: Recommendation["detection"] = {
    keywords: [server.name],
  };

  // Extract keywords from description
  const descLower = server.description.toLowerCase();
  const keywords: string[] = [];

  // Common service names
  const services = [
    "github",
    "gitlab",
    "aws",
    "azure",
    "gcp",
    "slack",
    "notion",
    "postgres",
    "mongodb",
    "redis",
    "elasticsearch",
  ];
  for (const service of services) {
    if (descLower.includes(service)) {
      keywords.push(service);
    }
  }

  if (keywords.length > 0) {
    rules.keywords = [...(rules.keywords || []), ...keywords];
  }

  // Environment variables as hints for dependencies
  if (server.environmentVariables && server.environmentVariables.length > 0) {
    rules.keywords = [...(rules.keywords || []), "api", "integration"];
  }

  return rules;
}
