/**
 * Recommendation Repository
 *
 * Handles data access for recommendations database
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RecommendationDatabase } from "../types/domain-types.js";

/**
 * Repository for managing recommendation data
 */
export class RecommendationRepository {
  private databasePath: string;
  private cache: RecommendationDatabase | null = null;

  constructor(databasePath?: string) {
    if (databasePath) {
      this.databasePath = databasePath;
    } else {
      // Default path: ../data/recommendations.json relative to this file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      this.databasePath = join(__dirname, "..", "..", "data", "recommendations.json");
    }
  }

  /**
   * Load the recommendations database
   */
  async load(): Promise<RecommendationDatabase> {
    // Return cached database if available
    if (this.cache) {
      return this.cache;
    }

    try {
      const content = await readFile(this.databasePath, "utf-8");
      const database = JSON.parse(content) as RecommendationDatabase;
      this.cache = database;
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
      return emptyDatabase;
    }
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
