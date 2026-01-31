#!/usr/bin/env npx tsx
/**
 * Data Fetch Script
 *
 * Fetches data from all sources and generates the recommendations database
 *
 * Usage: npm run fetch-data
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchMCPServers } from "../src/services/fetchers/mcp-fetcher.js";
import { fetchOfficialMCPServers } from "../src/services/fetchers/official-mcp-fetcher.js";
import { fetchOfficialSkills } from "../src/services/fetchers/official-skill-fetcher.js";
import { fetchPlugins } from "../src/services/fetchers/plugin-fetcher.js";
import { fetchSkills } from "../src/services/fetchers/skill-fetcher.js";
import { scanRepositories } from "../src/services/security-scanner.service.js";
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
 * 既存のデータベースを読み込み（存在しない場合は空配列）
 */
async function loadExistingDatabase(
  filePath: string,
): Promise<{ items: Recommendation[]; lastUpdated: string } | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const db = JSON.parse(content) as PluginDatabase | MCPServerDatabase | SkillDatabase;
    return { items: db.items, lastUpdated: db.lastUpdated };
  } catch {
    return null;
  }
}

/**
 * 既存アイテムのマップを作成（URL → アイテム）
 */
function createItemMap(items: Recommendation[]): Map<string, Recommendation> {
  const map = new Map<string, Recommendation>();
  for (const item of items) {
    const normalizedUrl = normalizeUrl(item.url);
    map.set(normalizedUrl, item);
  }
  return map;
}

/**
 * 既存のセキュリティスコアを新アイテムにコピー
 */
function copyExistingScores(
  newItems: Recommendation[],
  existingMap: Map<string, Recommendation>,
): { unchanged: number; new: number } {
  let unchanged = 0;
  let newCount = 0;

  for (const item of newItems) {
    const normalizedUrl = normalizeUrl(item.url);
    const existing = existingMap.get(normalizedUrl);

    if (existing?.metrics.securityScore !== undefined) {
      // 既存のスコアをコピー
      item.metrics.securityScore = existing.metrics.securityScore;
      unchanged++;
    } else {
      // 新規アイテム
      newCount++;
    }
  }

  return { unchanged, new: newCount };
}

/**
 * スキャンが必要なアイテムをフィルタリング
 */
function filterItemsToScan(
  items: Recommendation[],
  existingMap: Map<string, Recommendation>,
): Recommendation[] {
  return items.filter((item) => {
    const normalizedUrl = normalizeUrl(item.url);
    const existing = existingMap.get(normalizedUrl);
    // セキュリティスコアが存在しない = 新規または未スキャン
    return existing?.metrics.securityScore === undefined;
  });
}

/**
 * スキャン済みアイテムの結果を元のリストにマージ
 */
function mergeScannedResults(allItems: Recommendation[], scannedItems: Recommendation[]): void {
  const scannedMap = createItemMap(scannedItems);

  for (const item of allItems) {
    const normalizedUrl = normalizeUrl(item.url);
    const scanned = scannedMap.get(normalizedUrl);

    if (scanned?.metrics.securityScore !== undefined) {
      item.metrics.securityScore = scanned.metrics.securityScore;
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🚀 cc-recommender Data Fetcher");
  console.log("================================\n");

  const skipSecurityScan = process.env.SKIP_SECURITY_SCAN === "true";

  // 既存データを読み込み
  console.log("📂 Loading existing databases...");
  const [existingPlugins, existingMCP, existingSkills] = await Promise.all([
    loadExistingDatabase(PLUGINS_PATH),
    loadExistingDatabase(MCP_SERVERS_PATH),
    loadExistingDatabase(SKILLS_PATH),
  ]);

  const existingPluginsMap = existingPlugins ? createItemMap(existingPlugins.items) : new Map();
  const existingMCPMap = existingMCP ? createItemMap(existingMCP.items) : new Map();
  const existingSkillsMap = existingSkills ? createItemMap(existingSkills.items) : new Map();

  console.log(
    `   Loaded: ${existingPluginsMap.size} plugins, ${existingMCPMap.size} MCP, ${existingSkillsMap.size} skills\n`,
  );

  // 並列でデータ取得＆スキャン実行（既存データを渡す）
  const [plugins, mcpServers, skills] = await Promise.all([
    fetchAndScanPlugins(skipSecurityScan, existingPluginsMap),
    fetchAndScanMCPServers(skipSecurityScan, existingMCPMap),
    fetchAndScanSkills(skipSecurityScan, existingSkillsMap),
  ]);

  // 全データを結合して重複排除
  const allItems = [...plugins, ...mcpServers, ...skills];
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

  // タイプ別に分割
  const pluginItems = deduped.filter((i) => i.type === "plugin");
  const mcpServerItems = deduped.filter((i) => i.type === "mcp");
  const skillItems = deduped.filter(
    (i) =>
      i.type === "skill" ||
      i.type === "workflow" ||
      i.type === "hook" ||
      i.type === "command" ||
      i.type === "agent",
  );

  // 個別データベースを作成
  const version = "0.1.0";
  const lastUpdated = new Date().toISOString();

  const pluginDatabase: PluginDatabase = {
    version,
    lastUpdated,
    items: pluginItems,
  };

  const mcpServerDatabase: MCPServerDatabase = {
    version,
    lastUpdated,
    items: mcpServerItems,
  };

  const skillDatabase: SkillDatabase = {
    version,
    lastUpdated,
    items: skillItems,
  };

  // ファイルに書き込み
  await mkdir(DATA_DIR, { recursive: true });

  await Promise.all([
    writeFile(PLUGINS_PATH, JSON.stringify(pluginDatabase, null, 2)),
    writeFile(MCP_SERVERS_PATH, JSON.stringify(mcpServerDatabase, null, 2)),
    writeFile(SKILLS_PATH, JSON.stringify(skillDatabase, null, 2)),
  ]);

  console.log("\n✅ Databases saved:");
  console.log(`   - Plugins: ${PLUGINS_PATH} (${pluginItems.length} items)`);
  console.log(`   - MCP Servers: ${MCP_SERVERS_PATH} (${mcpServerItems.length} items)`);
  console.log(`   - Skills: ${SKILLS_PATH} (${skillItems.length} items)`);
}

/**
 * プラグインを取得してスキャン
 */
async function fetchAndScanPlugins(
  skipScan: boolean,
  existingMap: Map<string, Recommendation>,
): Promise<Recommendation[]> {
  console.log("📦 [Plugins] Fetching from official marketplace...");

  try {
    const items = await fetchPlugins();
    console.log(`   ✓ Fetched ${items.length} plugins`);

    // 既存スコアをコピー
    const { unchanged, new: newCount } = copyExistingScores(items, existingMap);
    console.log(`   📊 Existing: ${unchanged}, New: ${newCount}`);

    if (!skipScan && newCount > 0) {
      // 新規アイテムのみスキャン
      const itemsToScan = filterItemsToScan(items, existingMap);
      await scanItems(itemsToScan, "plugin", "Plugins");
      // スキャン結果を元のリストにマージ
      mergeScannedResults(items, itemsToScan);
    }

    return items;
  } catch (error) {
    console.error("   ✗ Failed to fetch plugins:", error);
    return [];
  }
}

/**
 * MCPサーバーを取得してスキャン
 */
async function fetchAndScanMCPServers(
  skipScan: boolean,
  existingMap: Map<string, Recommendation>,
): Promise<Recommendation[]> {
  console.log("🔌 [MCP] Fetching from multiple sources...");

  try {
    // Fetch from both sources in parallel
    const [awesomeItems, officialItems] = await Promise.all([
      fetchMCPServers(),
      fetchOfficialMCPServers(),
    ]);

    console.log(`   ✓ Fetched ${awesomeItems.length} from awesome-mcp-servers`);
    console.log(`   ✓ Fetched ${officialItems.length} from official registry`);

    // Combine and deduplicate (official takes precedence)
    const allItems = [...awesomeItems, ...officialItems];
    const items = deduplicateByUrl(allItems);
    console.log(`   ✓ Total after deduplication: ${items.length} MCP servers`);

    // 既存スコアをコピー
    const { unchanged, new: newCount } = copyExistingScores(items, existingMap);
    console.log(`   📊 Existing: ${unchanged}, New: ${newCount}`);

    if (!skipScan && newCount > 0) {
      // 新規アイテムのみスキャン
      const itemsToScan = filterItemsToScan(items, existingMap);
      await scanItems(itemsToScan, "mcp", "MCP Servers");
      // スキャン結果を元のリストにマージ
      mergeScannedResults(items, itemsToScan);
    }

    return items;
  } catch (error) {
    console.error("   ✗ Failed to fetch MCP servers:", error);
    return [];
  }
}

/**
 * スキルを取得してスキャン
 */
async function fetchAndScanSkills(
  skipScan: boolean,
  existingMap: Map<string, Recommendation>,
): Promise<Recommendation[]> {
  console.log("🎯 [Skills] Fetching from multiple sources...");

  try {
    // Fetch from multiple sources in parallel
    const [awesomeListSkills, officialSkills] = await Promise.all([
      fetchSkills(),
      fetchOfficialSkills(),
    ]);

    console.log(`   ✓ Fetched ${awesomeListSkills.length} from awesome-claude-code`);
    console.log(`   ✓ Fetched ${officialSkills.length} from official repositories`);

    // Combine and deduplicate (official takes precedence)
    const allSkills = [...officialSkills, ...awesomeListSkills];
    const items = deduplicateByUrl(allSkills);
    console.log(`   ✓ Total after deduplication: ${items.length} skills`);

    // 既存スコアをコピー
    const { unchanged, new: newCount } = copyExistingScores(items, existingMap);
    console.log(`   📊 Existing: ${unchanged}, New: ${newCount}`);

    if (!skipScan && newCount > 0) {
      // 新規アイテムのみスキャン
      const itemsToScan = filterItemsToScan(items, existingMap);
      await scanItems(itemsToScan, "skill", "Skills");
      // スキャン結果を元のリストにマージ
      mergeScannedResults(items, itemsToScan);
    }

    return items;
  } catch (error) {
    console.error("   ✗ Failed to fetch skills:", error);
    return [];
  }
}

/**
 * アイテムをスキャンしてセキュリティスコアを更新
 */
async function scanItems(
  items: Recommendation[],
  scanType: "mcp" | "skill" | "plugin",
  label: string,
): Promise<void> {
  const reposToScan = items
    .filter((item) => item.url.includes("github.com"))
    .map((item) => ({
      url: item.url,
      type: scanType,
    }));

  if (reposToScan.length === 0) {
    console.log(`   ⚠ No GitHub repositories to scan for ${label}`);
    return;
  }

  console.log(`   🔒 Scanning ${reposToScan.length} repositories...`);

  const scanResults = await scanRepositories(reposToScan, 10);

  // セキュリティスコアを更新
  for (const item of items) {
    const scanResult = scanResults.get(item.url);
    if (scanResult?.success) {
      item.metrics.securityScore = scanResult.score;
    }
  }

  const scannedCount = items.filter((i) => i.metrics.securityScore !== undefined).length;
  const avgScore =
    scannedCount > 0
      ? items
          .filter((i) => i.metrics.securityScore !== undefined)
          .reduce((sum, i) => sum + (i.metrics.securityScore || 0), 0) / scannedCount
      : 0;

  console.log(`   ✅ ${label}: Scanned ${scannedCount}/${reposToScan.length} repos`);
  console.log(`   📊 Average score: ${avgScore.toFixed(1)}/100`);
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

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
