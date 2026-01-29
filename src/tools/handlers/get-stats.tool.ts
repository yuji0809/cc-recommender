/**
 * Get Stats Tool
 *
 * Gets database statistics
 */

import type { RecommendationDatabase } from "../../types/domain-types.js";

export type GetStatsResult = {
  version: string;
  lastUpdated: string;
  totalItems: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  officialCount: number;
};

/**
 * Get database statistics
 */
export async function getStats(database: RecommendationDatabase): Promise<GetStatsResult> {
  const typeCount = new Map<string, number>();
  const sourceCount = new Map<string, number>();
  let officialCount = 0;

  for (const item of database.items) {
    // Count by type
    typeCount.set(item.type, (typeCount.get(item.type) || 0) + 1);

    // Count by source
    sourceCount.set(item.metrics.source, (sourceCount.get(item.metrics.source) || 0) + 1);

    // Count official
    if (item.metrics.isOfficial) {
      officialCount++;
    }
  }

  return {
    version: database.version,
    lastUpdated: database.lastUpdated,
    totalItems: database.items.length,
    byType: Object.fromEntries(typeCount),
    bySource: Object.fromEntries(sourceCount),
    officialCount,
  };
}
