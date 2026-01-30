#!/usr/bin/env npx tsx
/**
 * Data Fetch Script
 *
 * Fetches data from all sources and generates the recommendations database
 *
 * Usage: npm run fetch-data
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchMCPServers } from "../src/services/mcp-fetcher.js";
import { fetchPlugins } from "../src/services/plugin-fetcher.js";
import { scanRepositories } from "../src/services/security-scanner.service.js";
import { fetchSkills } from "../src/services/skill-fetcher.js";
import type {
  MCPServerDatabase,
  PluginDatabase,
  Recommendation,
  SkillDatabase,
} from "../src/types/domain-types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, "..", "data");
const PLUGINS_PATH = join(DATA_DIR, "plugins.json");
const MCP_SERVERS_PATH = join(DATA_DIR, "mcp-servers.json");
const SKILLS_PATH = join(DATA_DIR, "skills.json");

/**
 * Main function
 */
async function main() {
  console.log("🚀 cc-recommender Data Fetcher");
  console.log("================================\n");

  const allItems: Recommendation[] = [];

  // 1. Fetch plugins from official marketplace
  try {
    const plugins = await fetchPlugins();
    allItems.push(...plugins);
  } catch (error) {
    console.error("Failed to fetch plugins:", error);
  }

  // 2. Fetch MCP servers from awesome-mcp-servers
  try {
    const mcpServers = await fetchMCPServers();
    allItems.push(...mcpServers);
  } catch (error) {
    console.error("Failed to fetch MCP servers:", error);
  }

  // 3. Fetch skills from awesome-claude-code
  try {
    const skills = await fetchSkills();
    allItems.push(...skills);
  } catch (error) {
    console.error("Failed to fetch skills:", error);
  }

  // 4. Deduplicate by URL
  const deduped = deduplicateByUrl(allItems);

  console.log("\n📊 Summary:");
  console.log(`   Total items: ${deduped.length}`);
  console.log(`   - Plugins: ${deduped.filter((i) => i.type === "plugin").length}`);
  console.log(`   - MCP servers: ${deduped.filter((i) => i.type === "mcp").length}`);
  console.log(`   - Skills: ${deduped.filter((i) => i.type === "skill").length}`);
  console.log(`   - Workflows: ${deduped.filter((i) => i.type === "workflow").length}`);
  console.log(`   - Hooks: ${deduped.filter((i) => i.type === "hook").length}`);
  console.log(`   - Commands: ${deduped.filter((i) => i.type === "command").length}`);
  console.log(`   - Agents: ${deduped.filter((i) => i.type === "agent").length}`);

  // 5. Security scanning
  const skipSecurityScan = process.env.SKIP_SECURITY_SCAN === "true";

  if (skipSecurityScan) {
    console.log("\n🔒 Security Scanning: SKIPPED (SKIP_SECURITY_SCAN=true)");
  } else {
    console.log("\n🔒 Security Scanning:");
    console.log("   Scanning repositories with cc-audit...");

    const reposToScan = deduped
      .filter((item) => item.url.includes("github.com"))
      .map((item) => ({
        url: item.url,
        type: getScanType(item.type),
      }));

    console.log(`   Scanning ${reposToScan.length} GitHub repositories...`);

    const scanResults = await scanRepositories(reposToScan, 3);

    // Update security scores
    for (const item of deduped) {
      const scanResult = scanResults.get(item.url);
      if (scanResult?.success) {
        item.metrics.securityScore = scanResult.score;
      }
    }

    const scannedCount = deduped.filter((i) => i.metrics.securityScore !== undefined).length;
    const avgScore =
      deduped
        .filter((i) => i.metrics.securityScore !== undefined)
        .reduce((sum, i) => sum + (i.metrics.securityScore || 0), 0) / scannedCount;

    console.log(`   ✅ Scanned: ${scannedCount}/${deduped.length} items`);
    console.log(`   📊 Average security score: ${avgScore.toFixed(1)}/100`);
  }

  // 6. Split items by type
  const plugins = deduped.filter((i) => i.type === "plugin");
  const mcpServers = deduped.filter((i) => i.type === "mcp");
  const skills = deduped.filter(
    (i) =>
      i.type === "skill" ||
      i.type === "workflow" ||
      i.type === "hook" ||
      i.type === "command" ||
      i.type === "agent",
  );

  // 7. Create separate databases
  const version = "0.1.0";
  const lastUpdated = new Date().toISOString();

  const pluginDatabase: PluginDatabase = {
    version,
    lastUpdated,
    items: plugins,
  };

  const mcpServerDatabase: MCPServerDatabase = {
    version,
    lastUpdated,
    items: mcpServers,
  };

  const skillDatabase: SkillDatabase = {
    version,
    lastUpdated,
    items: skills,
  };

  // 8. Write to separate files
  await mkdir(DATA_DIR, { recursive: true });

  await Promise.all([
    writeFile(PLUGINS_PATH, JSON.stringify(pluginDatabase, null, 2)),
    writeFile(MCP_SERVERS_PATH, JSON.stringify(mcpServerDatabase, null, 2)),
    writeFile(SKILLS_PATH, JSON.stringify(skillDatabase, null, 2)),
  ]);

  console.log("\n✅ Databases saved:");
  console.log(`   - Plugins: ${PLUGINS_PATH} (${plugins.length} items)`);
  console.log(`   - MCP Servers: ${MCP_SERVERS_PATH} (${mcpServers.length} items)`);
  console.log(`   - Skills: ${SKILLS_PATH} (${skills.length} items)`);
}

/**
 * Deduplicate items by URL
 */
function deduplicateByUrl(items: Recommendation[]): Recommendation[] {
  const seen = new Map<string, Recommendation>();

  for (const item of items) {
    const normalizedUrl = normalizeUrl(item.url);

    if (!seen.has(normalizedUrl)) {
      seen.set(normalizedUrl, item);
    } else {
      // Prefer official over community
      const existing = seen.get(normalizedUrl);
      if (existing !== undefined && item.metrics.isOfficial && !existing.metrics.isOfficial) {
        seen.set(normalizedUrl, item);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .replace(/\/tree\/main.*$/, "")
    .replace(/\/blob\/main.*$/, "");
}

/**
 * Get scan type from recommendation type
 */
function getScanType(type: Recommendation["type"]): "mcp" | "skill" | "plugin" {
  if (type === "mcp") return "mcp";
  if (type === "plugin") return "plugin";
  return "skill"; // skill, workflow, hook, command, agent
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
