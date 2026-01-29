/**
 * Plugin Fetcher
 *
 * Fetches plugins from official Claude Code marketplace
 * Source: https://github.com/anthropics/claude-plugins-official
 */

import type { RawPluginEntry, Recommendation } from "../types/index.js";

const MARKETPLACE_URL =
  "https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/.claude-plugin/marketplace.json";

type MarketplaceJSON = {
  $schema: string;
  name: string;
  author: { name: string };
  plugins: RawPluginEntry[];
};

/**
 * Fetch plugins from the official Anthropic marketplace
 */
export async function fetchPlugins(): Promise<Recommendation[]> {
  console.log("📦 Fetching plugins from official marketplace...");

  try {
    const response = await fetch(MARKETPLACE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as MarketplaceJSON;
    const recommendations: Recommendation[] = [];

    for (const plugin of data.plugins) {
      const rec = transformPlugin(plugin);
      if (rec) {
        recommendations.push(rec);
      }
    }

    console.log(`   ✓ Fetched ${recommendations.length} plugins`);
    return recommendations;
  } catch (error) {
    console.error("   ✗ Failed to fetch plugins:", error);
    return [];
  }
}

/**
 * Transform raw plugin entry to unified Recommendation
 */
function transformPlugin(raw: RawPluginEntry): Recommendation | null {
  try {
    // Determine source URL
    const sourceUrl =
      typeof raw.source === "string"
        ? `https://github.com/anthropics/claude-plugins-official/tree/main/${raw.source}`
        : raw.source.url;

    // Determine type based on category and features
    let type: Recommendation["type"] = "plugin";
    if (raw.lspServers) {
      type = "plugin"; // LSP plugins
    }

    // Extract detection rules
    const detection = extractDetectionRules(raw);

    // Determine if official
    const isOfficial = raw.author.name.toLowerCase().includes("anthropic");

    return {
      id: `plugin-${raw.name}`,
      name: raw.name,
      type,
      url: raw.homepage || sourceUrl,
      description: raw.description,
      author: {
        name: raw.author.name,
        email: raw.author.email,
      },
      category: raw.category,
      tags: raw.tags || [raw.category],
      detection,
      metrics: {
        source: isOfficial ? "official" : "community",
        isOfficial,
      },
      install: {
        method: "plugin",
        command: `/plugin install ${raw.name}`,
        marketplace: "claude-plugins-official",
      },
    };
  } catch {
    console.warn(`   ⚠ Failed to transform plugin: ${raw.name}`);
    return null;
  }
}

/**
 * Extract detection rules from plugin entry
 */
function extractDetectionRules(raw: RawPluginEntry): Recommendation["detection"] {
  const rules: Recommendation["detection"] = {
    keywords: [raw.category, ...(raw.tags || [])],
  };

  // LSP plugins - extract language info
  if (raw.lspServers) {
    const languages: string[] = [];
    const files: string[] = [];

    for (const [_serverName, config] of Object.entries(raw.lspServers)) {
      const serverConfig = config as { extensionToLanguage?: Record<string, string> };

      if (serverConfig.extensionToLanguage) {
        for (const [ext, lang] of Object.entries(serverConfig.extensionToLanguage)) {
          languages.push(lang);
          files.push(`*.${ext}`);
        }
      }
    }

    if (languages.length > 0) {
      rules.languages = [...new Set(languages)];
    }
    if (files.length > 0) {
      rules.files = [...new Set(files)];
    }
  }

  // Category-based detection
  const categoryMappings: Record<string, Partial<Recommendation["detection"]>> = {
    development: {
      keywords: ["development", "coding", "ide"],
    },
    productivity: {
      keywords: ["productivity", "workflow", "automation"],
    },
    database: {
      keywords: ["database", "sql", "nosql"],
      dependencies: ["prisma", "@prisma/client", "mongoose", "typeorm"],
    },
    security: {
      keywords: ["security", "audit", "vulnerability"],
    },
    testing: {
      keywords: ["testing", "test", "e2e"],
      dependencies: ["jest", "vitest", "playwright", "cypress"],
    },
    deployment: {
      keywords: ["deploy", "ci", "cd"],
    },
  };

  const mapping = categoryMappings[raw.category];
  if (mapping) {
    if (mapping.keywords) {
      rules.keywords = [...(rules.keywords || []), ...mapping.keywords];
    }
    if (mapping.dependencies) {
      rules.dependencies = mapping.dependencies;
    }
  }

  return rules;
}
