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
import { SECURITY_CONFIG } from "../src/config/constants.js";
import { ENV } from "../src/config/env.js";
import { fetchMCPServers } from "../src/services/fetchers/mcp/mcp-fetcher.js";
import { fetchOfficialMCPServers } from "../src/services/fetchers/mcp/official-mcp-fetcher.js";
import { fetchPlugins } from "../src/services/fetchers/plugins/plugin-fetcher.js";
import { fetchCuratedListSkills } from "../src/services/fetchers/skills/curated-list-fetcher.js";
import { fetchDirectSkills } from "../src/services/fetchers/skills/direct-skill-fetcher.js";
import { scanRepositories } from "../src/services/security-scanner.service.js";
import type {
  MCPServerDatabase,
  PluginDatabase,
  Recommendation,
  SkillDatabase,
} from "../src/types/domain-types.js";
import { isGitHubUrl } from "../src/utils/github-url.js";

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

  const startedAt = Date.now();
  const skipSecurityScan = ENV.SKIP_SECURITY_SCAN;
  const fetchTypes = ENV.FETCH_TYPES;
  // この時刻を過ぎたら新しいスキャンを始めない（残りはスコアなしで残し、次回スキャンする）
  const scanTimeLimit = ENV.SECURITY_SCAN_TIME_LIMIT_MINUTES;
  const scanDeadline = scanTimeLimit ? startedAt + scanTimeLimit * 60_000 : undefined;
  if (scanTimeLimit) {
    console.log(`⏱  Security scan time limit: ${scanTimeLimit} min`);
  }

  // Display fetch types
  if (fetchTypes && fetchTypes.size > 0) {
    console.log(`📋 Fetch types: ${Array.from(fetchTypes).join(", ")}`);
  } else {
    console.log("📋 Fetch types: all (plugins, mcp, skills)");
  }
  console.log("");

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

  // 条件付きでデータ取得（指定されたもののみ）
  const shouldFetchPlugins = !fetchTypes || fetchTypes.has("plugins");
  const shouldFetchMCP = !fetchTypes || fetchTypes.has("mcp");
  const shouldFetchSkills = !fetchTypes || fetchTypes.has("skills");

  // 並列でデータ取得＆スキャン実行（既存データを渡す）
  const fetchPromises: Promise<Recommendation[]>[] = [];

  if (shouldFetchPlugins) {
    fetchPromises.push(fetchAndScanPlugins(skipSecurityScan, existingPluginsMap, scanDeadline));
  }
  if (shouldFetchMCP) {
    fetchPromises.push(fetchAndScanMCPServers(skipSecurityScan, existingMCPMap, scanDeadline));
  }
  if (shouldFetchSkills) {
    fetchPromises.push(fetchAndScanSkills(skipSecurityScan, existingSkillsMap, scanDeadline));
  }

  const results = await Promise.all(fetchPromises);

  // 結果を種類別に分割（部分フェッチの場合は既存データを保持）
  let plugins: Recommendation[];
  let mcpServers: Recommendation[];
  let skills: Recommendation[];

  let resultIndex = 0;
  if (shouldFetchPlugins) {
    plugins = results[resultIndex++];
  } else {
    // 既存データを保持
    plugins = existingPlugins?.items || [];
    console.log(`   ℹ Skipped plugins fetch, using ${plugins.length} existing items`);
  }

  if (shouldFetchMCP) {
    mcpServers = results[resultIndex++];
  } else {
    // 既存データを保持
    mcpServers = existingMCP?.items || [];
    console.log(`   ℹ Skipped MCP fetch, using ${mcpServers.length} existing items`);
  }

  if (shouldFetchSkills) {
    skills = results[resultIndex++];
  } else {
    // 既存データを保持
    skills = existingSkills?.items || [];
    console.log(`   ℹ Skipped skills fetch, using ${skills.length} existing items`);
  }

  // タイプ別に重複排除（独立して管理）
  const pluginItems = deduplicateByUrl(plugins);
  const mcpServerItems = deduplicateByUrl(mcpServers);
  // Skills: No deduplication - each skill has unique path
  const skillItems = skills;

  // 全体のサマリー
  const totalItems = pluginItems.length + mcpServerItems.length + skillItems.length;

  console.log("\n📊 Summary:");
  console.log(`   Total items: ${totalItems}`);
  console.log(`   - Plugins: ${pluginItems.length}`);
  console.log(`   - MCP servers: ${mcpServerItems.length}`);
  console.log(`   - Skills: ${skillItems.filter((i) => i.type === "skill").length}`);
  console.log(`   - Workflows: ${skillItems.filter((i) => i.type === "workflow").length}`);
  console.log(`   - Hooks: ${skillItems.filter((i) => i.type === "hook").length}`);
  console.log(`   - Commands: ${skillItems.filter((i) => i.type === "command").length}`);
  console.log(`   - Agents: ${skillItems.filter((i) => i.type === "agent").length}`);

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
  console.log(`\nFinished in ${((Date.now() - startedAt) / 60_000).toFixed(1)} min`);
}

/**
 * プラグインを取得してスキャン
 */
async function fetchAndScanPlugins(
  skipScan: boolean,
  existingMap: Map<string, Recommendation>,
  scanDeadline: number | undefined,
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
      await scanItems(itemsToScan, "plugin", "Plugins", scanDeadline);
      // スキャン結果を元のリストにマージ
      mergeScannedResults(items, itemsToScan);
    }

    // セキュリティフィルタリング
    if (!skipScan) {
      return filterBySecurityScore(items, "Plugins");
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
  scanDeadline: number | undefined,
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
      await scanItems(itemsToScan, "mcp", "MCP Servers", scanDeadline);
      // スキャン結果を元のリストにマージ
      mergeScannedResults(items, itemsToScan);
    }

    // セキュリティフィルタリング
    if (!skipScan) {
      return filterBySecurityScore(items, "MCP Servers");
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
  scanDeadline: number | undefined,
): Promise<Recommendation[]> {
  console.log("🎯 [Skills] Fetching from multiple sources...");

  try {
    // Fetch from both direct repositories and curated lists
    const [directSkills, curatedListSkills] = await Promise.all([
      fetchDirectSkills(),
      fetchCuratedListSkills(),
    ]);

    console.log(`   ✓ Fetched ${directSkills.length} from direct repositories`);
    console.log(`   ✓ Fetched ${curatedListSkills.length} from curated lists`);

    // Combine all skills (no deduplication - each skill is unique by path)
    const items = [...directSkills, ...curatedListSkills];
    console.log(`   ✓ Total: ${items.length} skills (no deduplication)`);

    // Report on skill sources
    const officialCount = items.filter((s) => s.metrics.isOfficial).length;
    const communityCount = items.length - officialCount;
    console.log(`   📊 Breakdown: ${officialCount} official, ${communityCount} community`);

    // 既存スコアをコピー
    const { unchanged, new: newCount } = copyExistingScores(items, existingMap);
    console.log(`   📊 Existing: ${unchanged}, New: ${newCount}`);

    if (!skipScan && newCount > 0) {
      // 新規アイテムのみスキャン
      const itemsToScan = filterItemsToScan(items, existingMap);
      await scanItems(itemsToScan, "skill", "Skills", scanDeadline);
      // スキャン結果を元のリストにマージ
      mergeScannedResults(items, itemsToScan);
    }

    // セキュリティフィルタリング
    if (!skipScan) {
      return filterBySecurityScore(items, "Skills");
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
  scanDeadline: number | undefined,
): Promise<void> {
  const reposToScan = items
    .filter((item) => isGitHubUrl(item.url))
    .map((item) => ({
      url: item.url,
      type: scanType,
    }));

  if (reposToScan.length === 0) {
    console.log(`   ⚠ No GitHub repositories to scan for ${label}`);
    return;
  }

  console.log(`   🔒 Scanning ${reposToScan.length} repositories...`);

  const scanResults = await scanRepositories(reposToScan, 10, { deadline: scanDeadline });

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

/**
 * Filter items by security score
 */
function filterBySecurityScore(items: Recommendation[], label: string): Recommendation[] {
  const beforeCount = items.length;
  const excluded: Recommendation[] = [];

  const filtered = items.filter((item) => {
    const score = item.metrics.securityScore;

    // Allow items without security scores (non-GitHub repos, etc.)
    if (score === undefined) {
      return !SECURITY_CONFIG.excludeUnscored;
    }

    // Filter by minimum score
    if (score < SECURITY_CONFIG.minSecurityScore) {
      excluded.push(item);
      return false;
    }

    return true;
  });

  if (excluded.length > 0) {
    console.log(
      `   🚫 Excluded ${excluded.length} items (security score < ${SECURITY_CONFIG.minSecurityScore}):`,
    );
    for (const item of excluded) {
      console.log(`      - ${item.name} (score: ${item.metrics.securityScore})`);
    }
  }

  const afterCount = filtered.length;
  if (beforeCount !== afterCount) {
    console.log(`   ✓ ${label}: ${afterCount}/${beforeCount} items passed security filter`);
  }

  return filtered;
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
