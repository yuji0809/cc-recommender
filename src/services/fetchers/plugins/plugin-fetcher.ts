/**
 * Plugin Fetcher
 *
 * Fetches plugins from official Claude Code marketplace
 * Source: https://github.com/anthropics/claude-plugins-official
 */

import type { Recommendation } from "../../../types/domain-types.js";
import type { RawPluginEntry } from "../../../types/raw-types.js";

const MARKETPLACE_URL =
  "https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/.claude-plugin/marketplace.json";

type MarketplaceJSON = {
  $schema: string;
  name: string;
  owner: { name: string; email?: string };
  plugins: RawPluginEntry[];
};

/**
 * Category-based detection mappings for plugins
 */
const CATEGORY_MAPPINGS: Record<string, Partial<Recommendation["detection"]>> = {
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
      const rec = transformPlugin(plugin, data.owner);
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
function transformPlugin(
  raw: RawPluginEntry,
  fallbackAuthor: { name: string; email?: string },
): Recommendation | null {
  try {
    // Validate required fields
    if (!raw.name || !raw.description) {
      console.warn(
        `   ⚠ Failed to transform plugin: ${raw.name || "unknown"} - missing required fields`,
      );
      return null;
    }

    // Use plugin author or fallback to marketplace owner
    const author = raw.author || fallbackAuthor;

    // Determine source URL
    const sourceUrl =
      typeof raw.source === "string"
        ? `https://github.com/anthropics/claude-plugins-official/tree/main/${raw.source}`
        : raw.source?.url || `https://github.com/anthropics/claude-plugins-official`;

    // Determine type based on category and features
    let type: Recommendation["type"] = "plugin";
    if (raw.lspServers) {
      type = "plugin"; // LSP plugins
    }

    // Extract detection rules
    const detection = extractDetectionRules(raw);

    // Determine if official
    const isOfficial = author.name.toLowerCase().includes("anthropic");

    return {
      id: `plugin-${raw.name}`,
      name: raw.name,
      type,
      url: raw.homepage || sourceUrl,
      description: raw.description,
      author: {
        name: author.name,
        email: author.email,
      },
      category: raw.category || "other",
      tags: raw.tags || [raw.category || "plugin"],
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
  } catch (error) {
    console.warn(
      `   ⚠ Failed to transform plugin: ${raw.name || "unknown"} -`,
      error instanceof Error ? error.message : String(error),
    );
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
  const mapping = CATEGORY_MAPPINGS[raw.category];
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
