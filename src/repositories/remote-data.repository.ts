/**
 * Remote Data Repository
 *
 * Fetches latest recommendations data from CDN/GitHub
 */

import type {
  MCPServerDatabase,
  PluginDatabase,
  RecommendationDatabase,
  SkillDatabase,
} from "../types/index.js";

/** デフォルトのリモートデータURL（ベース） */
const REMOTE_BASE_URL = "https://raw.githubusercontent.com/yuji0809/cc-recommender/main/data";

/** デフォルトのリモートデータURL */
const DEFAULT_PLUGINS_URL = `${REMOTE_BASE_URL}/plugins.json`;
const DEFAULT_MCP_SERVERS_URL = `${REMOTE_BASE_URL}/mcp-servers.json`;
const DEFAULT_SKILLS_URL = `${REMOTE_BASE_URL}/skills.json`;

/** タイムアウト時間（ミリ秒） */
const FETCH_TIMEOUT = 5000;

/** JSON全体の最大サイズ（10MB） */
const MAX_JSON_SIZE = 10 * 1024 * 1024;

/** 単一アイテムの最大サイズ（100KB） */
const MAX_ITEM_SIZE = 100 * 1024;

/** ETagキャッシュ（URL → ETag） */
const etagCache = new Map<string, string>();

/** データキャッシュ（URL → データ）304対応用 */
const dataCache = new Map<string, unknown>();

/**
 * リモートからレコメンデーションデータを取得
 *
 * @param remoteUrl - リモートデータのURL（省略時はデフォルト）
 * @returns データベース or null（失敗時）
 */
export async function fetchRemoteData(remoteUrl?: string): Promise<RecommendationDatabase | null> {
  try {
    console.error("Fetching latest data from remote...");

    // カスタムURLが指定された場合は従来の単一ファイル方式
    if (remoteUrl) {
      return await fetchSingleFile(remoteUrl);
    }

    // デフォルトは3ファイル並列取得
    const [pluginsDb, mcpServersDb, skillsDb] = await Promise.all([
      fetchPlugins(),
      fetchMCPServers(),
      fetchSkills(),
    ]);

    // いずれかが失敗した場合はnull
    if (!pluginsDb || !mcpServersDb || !skillsDb) {
      console.error("⚠️  Failed to fetch one or more data files");
      return null;
    }

    // マージして統合データベースを作成
    const mergedDatabase: RecommendationDatabase = {
      version: pluginsDb.version,
      lastUpdated: pluginsDb.lastUpdated,
      items: [...pluginsDb.items, ...mcpServersDb.items, ...skillsDb.items],
    };

    console.error(
      `✅ Loaded ${mergedDatabase.items.length} recommendations from remote (${mergedDatabase.version})`,
    );
    console.error(
      `   - Plugins: ${pluginsDb.items.length}, MCP: ${mcpServersDb.items.length}, Skills: ${skillsDb.items.length}`,
    );

    return mergedDatabase;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Failed to fetch remote data: ${error.message}`);
    }
    return null;
  }
}

/**
 * プラグインデータを取得
 */
async function fetchPlugins(): Promise<PluginDatabase | null> {
  return await fetchTypedFile<PluginDatabase>(DEFAULT_PLUGINS_URL, isValidPluginDatabase);
}

/**
 * MCPサーバーデータを取得
 */
async function fetchMCPServers(): Promise<MCPServerDatabase | null> {
  return await fetchTypedFile<MCPServerDatabase>(DEFAULT_MCP_SERVERS_URL, isValidMCPServerDatabase);
}

/**
 * スキルデータを取得
 */
async function fetchSkills(): Promise<SkillDatabase | null> {
  return await fetchTypedFile<SkillDatabase>(DEFAULT_SKILLS_URL, isValidSkillDatabase);
}

/**
 * 単一ファイルからデータを取得（後方互換性用）
 */
async function fetchSingleFile(url: string): Promise<RecommendationDatabase | null> {
  return await fetchTypedFile<RecommendationDatabase>(url, isValidDatabase);
}

/**
 * 型付きファイルを取得（ETag対応）
 */
async function fetchTypedFile<T>(
  url: string,
  validator: (data: unknown) => data is T,
): Promise<T | null> {
  try {
    // タイムアウト付きfetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // ヘッダーを準備（ETagがあれば If-None-Match を追加）
    const headers: Record<string, string> = {
      "User-Agent": "cc-recommender",
      Accept: "application/json",
    };

    const cachedEtag = etagCache.get(url);
    if (cachedEtag) {
      headers["If-None-Match"] = cachedEtag;
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);

    // 304 Not Modified - キャッシュを返す
    if (response.status === 304) {
      console.error(`📦 Cache hit for ${url} (304 Not Modified)`);
      const cachedData = dataCache.get(url);
      if (cachedData && validator(cachedData)) {
        return cachedData as T;
      }
      console.error(`⚠️  Cache miss - 304 but no cached data for ${url}`);
      return null;
    }

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    // Content-Type 検証
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error(`⚠️  Invalid content-type for ${url}: ${contentType}`);
      return null;
    }

    const data = (await response.json()) as T;

    // データ検証
    if (!validator(data)) {
      console.error(`⚠️  Data validation failed for ${url}`);
      return null;
    }

    // ETagを保存
    const newEtag = response.headers.get("etag");
    if (newEtag) {
      etagCache.set(url, newEtag);
      dataCache.set(url, data);
      console.error(`💾 Cached ETag for ${url}: ${newEtag.substring(0, 12)}...`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(`Fetch timeout for ${url} (5s)`);
      } else {
        console.error(`Failed to fetch ${url}: ${error.message}`);
      }
    }
    return null;
  }
}

/**
 * データベースの妥当性を検証
 *
 * @param data - 検証するデータ
 * @returns 妥当ならtrue
 */
function isValidDatabase(data: unknown): data is RecommendationDatabase {
  if (!data || typeof data !== "object") {
    return false;
  }

  const db = data as RecommendationDatabase;

  // 必須フィールドチェック
  if (!db.version || typeof db.version !== "string") {
    return false;
  }

  if (!db.lastUpdated || typeof db.lastUpdated !== "string") {
    return false;
  }

  if (!Array.isArray(db.items)) {
    return false;
  }

  // JSON全体のサイズチェック
  const jsonSize = JSON.stringify(data).length;
  if (jsonSize > MAX_JSON_SIZE) {
    console.error(`⚠️  Suspicious: JSON too large (${(jsonSize / 1024 / 1024).toFixed(2)}MB)`);
    return false;
  }

  // アイテム数チェック（異常に多い場合は拒否）
  if (db.items.length > 10000) {
    console.error("⚠️  Suspicious: Too many items");
    return false;
  }

  // 全アイテムの検証
  for (let i = 0; i < db.items.length; i++) {
    const item = db.items[i];

    // 必須フィールドチェック
    if (!item.id || typeof item.id !== "string") {
      console.error(`⚠️  Invalid item at index ${i}: missing or invalid id`);
      return false;
    }

    if (!item.name || typeof item.name !== "string") {
      console.error(`⚠️  Invalid item at index ${i}: missing or invalid name`);
      return false;
    }

    if (!item.type || typeof item.type !== "string") {
      console.error(`⚠️  Invalid item at index ${i}: missing or invalid type`);
      return false;
    }

    // 型の妥当性チェック
    const validTypes = ["plugin", "mcp-server", "skill"];
    if (!validTypes.includes(item.type)) {
      console.error(`⚠️  Invalid item at index ${i}: invalid type "${item.type}"`);
      return false;
    }

    // 個別アイテムのサイズチェック
    const itemSize = JSON.stringify(item).length;
    if (itemSize > MAX_ITEM_SIZE) {
      console.error(`⚠️  Suspicious: Item ${item.id} too large (${(itemSize / 1024).toFixed(2)}KB)`);
      return false;
    }
  }

  return true;
}

/**
 * プラグインデータベースの妥当性を検証
 */
function isValidPluginDatabase(data: unknown): data is PluginDatabase {
  return isValidTypedDatabase(data, "plugin");
}

/**
 * MCPサーバーデータベースの妥当性を検証
 */
function isValidMCPServerDatabase(data: unknown): data is MCPServerDatabase {
  return isValidTypedDatabase(data, "mcp");
}

/**
 * スキルデータベースの妥当性を検証
 */
function isValidSkillDatabase(data: unknown): data is SkillDatabase {
  const validTypes = ["skill", "workflow", "hook", "command", "agent"];
  return isValidTypedDatabase(data, validTypes);
}

/**
 * 型指定されたデータベースの妥当性を検証
 */
function isValidTypedDatabase(
  data: unknown,
  expectedTypes: string | string[],
): data is PluginDatabase | MCPServerDatabase | SkillDatabase {
  if (!data || typeof data !== "object") {
    return false;
  }

  const db = data as PluginDatabase | MCPServerDatabase | SkillDatabase;

  // 必須フィールドチェック
  if (!db.version || typeof db.version !== "string") {
    return false;
  }

  if (!db.lastUpdated || typeof db.lastUpdated !== "string") {
    return false;
  }

  if (!Array.isArray(db.items)) {
    return false;
  }

  // JSON全体のサイズチェック
  const jsonSize = JSON.stringify(data).length;
  if (jsonSize > MAX_JSON_SIZE) {
    console.error(`⚠️  Suspicious: JSON too large (${(jsonSize / 1024 / 1024).toFixed(2)}MB)`);
    return false;
  }

  // アイテム数チェック
  if (db.items.length > 10000) {
    console.error("⚠️  Suspicious: Too many items");
    return false;
  }

  const allowedTypes = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];

  // 全アイテムの検証
  for (let i = 0; i < db.items.length; i++) {
    const item = db.items[i];

    // 必須フィールドチェック
    if (!item.id || typeof item.id !== "string") {
      console.error(`⚠️  Invalid item at index ${i}: missing or invalid id`);
      return false;
    }

    if (!item.name || typeof item.name !== "string") {
      console.error(`⚠️  Invalid item at index ${i}: missing or invalid name`);
      return false;
    }

    if (!item.type || typeof item.type !== "string") {
      console.error(`⚠️  Invalid item at index ${i}: missing or invalid type`);
      return false;
    }

    // 型の妥当性チェック
    if (!allowedTypes.includes(item.type)) {
      console.error(`⚠️  Invalid item at index ${i}: unexpected type "${item.type}"`);
      return false;
    }

    // 個別アイテムのサイズチェック
    const itemSize = JSON.stringify(item).length;
    if (itemSize > MAX_ITEM_SIZE) {
      console.error(`⚠️  Suspicious: Item ${item.id} too large (${(itemSize / 1024).toFixed(2)}KB)`);
      return false;
    }
  }

  return true;
}

/**
 * リモートデータ取得が有効かチェック
 *
 * @returns 有効ならtrue
 */
export function isRemoteDataEnabled(): boolean {
  // 環境変数でオフライン強制可能
  return process.env.CC_RECOMMENDER_OFFLINE_MODE !== "true";
}
