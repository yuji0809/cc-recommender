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
import type { Recommendation, RecommendationDatabase } from "../src/types/domain-types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_PATH = join(__dirname, "..", "data", "recommendations.json");

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

  // 6. Create database
  const database: RecommendationDatabase = {
    version: "0.1.0",
    lastUpdated: new Date().toISOString(),
    items: deduped,
  };

  // 6. Write to file
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(database, null, 2));

  console.log(`\n✅ Database saved to: ${OUTPUT_PATH}`);
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
