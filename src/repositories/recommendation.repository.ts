/**
 * Recommendation Repository
 *
 * Handles data access for recommendations database
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  MCPServerDatabase,
  PluginDatabase,
  RecommendationDatabase,
  SkillDatabase,
} from "../types/domain-types.js";
import { fetchRemoteData, isRemoteDataEnabled } from "./remote-data.repository.js";

/**
 * Repository for managing recommendation data
 */
export class RecommendationRepository {
  private pluginsPath: string;
  private mcpServersPath: string;
  private skillsPath: string;
  private cache: RecommendationDatabase | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 3600000; // 1 hour in milliseconds

  constructor(dataDir?: string) {
    if (dataDir) {
      this.pluginsPath = join(dataDir, "plugins.json");
      this.mcpServersPath = join(dataDir, "mcp-servers.json");
      this.skillsPath = join(dataDir, "skills.json");
    } else {
      // Default paths: ../data/*.json relative to this file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const defaultDataDir = join(__dirname, "..", "..", "data");
      this.pluginsPath = join(defaultDataDir, "plugins.json");
      this.mcpServersPath = join(defaultDataDir, "mcp-servers.json");
      this.skillsPath = join(defaultDataDir, "skills.json");
    }
  }

  /**
   * Load the recommendations database
   *
   * Strategy:
   * 1. Return cached database if available and not expired
   * 2. Try to fetch from remote (GitHub) if enabled
   * 3. Fallback to bundled data (load 3 files in parallel)
   */
  async load(): Promise<RecommendationDatabase> {
    const now = Date.now();

    // Return cached database if available and not expired
    if (this.cache && now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cache;
    }

    // Cache expired or not available - clear it
    if (this.cache) {
      console.log("🔄 Cache expired, refreshing data...");
      this.cache = null;
    }

    // Try remote data first (if enabled)
    if (isRemoteDataEnabled()) {
      const remoteData = await fetchRemoteData();
      if (remoteData) {
        this.cache = remoteData;
        this.cacheTimestamp = Date.now();
        return remoteData;
      }
      console.warn("⚠️  Falling back to bundled data");
    }

    // Fallback to bundled data (load 3 files in parallel)
    try {
      const [pluginsDb, mcpServersDb, skillsDb] = await Promise.all([
        this.loadPlugins(),
        this.loadMCPServers(),
        this.loadSkills(),
      ]);

      // Merge databases
      const database: RecommendationDatabase = {
        version: pluginsDb.version,
        lastUpdated: pluginsDb.lastUpdated,
        items: [...pluginsDb.items, ...mcpServersDb.items, ...skillsDb.items],
      };

      this.cache = database;
      this.cacheTimestamp = Date.now();
      console.log(
        `📦 Loaded ${database.items.length} recommendations from bundled data (${database.version})`,
      );
      console.log(
        `   - Plugins: ${pluginsDb.items.length}, MCP: ${mcpServersDb.items.length}, Skills: ${skillsDb.items.length}`,
      );
      return database;
    } catch (error) {
      console.error("Failed to load database:", error);
      // Return empty database
      const emptyDatabase: RecommendationDatabase = {
        version: "0.0.0",
        lastUpdated: new Date().toISOString(),
        items: [],
      };
      this.cache = emptyDatabase;
      this.cacheTimestamp = Date.now();
      return emptyDatabase;
    }
  }

  /**
   * Load plugins from bundled data
   */
  private async loadPlugins(): Promise<PluginDatabase> {
    const content = await readFile(this.pluginsPath, "utf-8");
    return JSON.parse(content) as PluginDatabase;
  }

  /**
   * Load MCP servers from bundled data
   */
  private async loadMCPServers(): Promise<MCPServerDatabase> {
    const content = await readFile(this.mcpServersPath, "utf-8");
    return JSON.parse(content) as MCPServerDatabase;
  }

  /**
   * Load skills from bundled data
   */
  private async loadSkills(): Promise<SkillDatabase> {
    const content = await readFile(this.skillsPath, "utf-8");
    return JSON.parse(content) as SkillDatabase;
  }

  /**
   * Reload the database (clears cache)
   */
  async reload(): Promise<RecommendationDatabase> {
    this.cache = null;
    return this.load();
  }

  /**
   * Get the current cached database without loading
   */
  getCached(): RecommendationDatabase | null {
    return this.cache;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache = null;
  }
}

/**
 * Default repository instance
 */
export const recommendationRepository = new RecommendationRepository();
