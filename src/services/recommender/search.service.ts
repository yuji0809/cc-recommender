/**
 * Search Service
 *
 * Searches for recommendations based on user query
 */

import type { Recommendation, RecommendationDatabase } from "../../types/domain-types.js";
import type { ScoredRecommendation } from "../../types/service-types.js";

/** Options for search function */
export type SearchOptions = {
  /** Maximum number of results */
  maxResults?: number;
  /** Filter by types */
  types?: Recommendation["type"][];
};

/**
 * Search for recommendations by query
 *
 * @param database - The recommendations database
 * @param query - The search query
 * @param options - Search options
 * @returns List of scored recommendations
 */
export function search(
  database: RecommendationDatabase,
  query: string,
  options: SearchOptions = {},
): ScoredRecommendation[] {
  const { maxResults = 20, types } = options;

  const queryLower = query.toLowerCase();
  const results: ScoredRecommendation[] = [];

  for (const item of database.items) {
    // Filter by type if specified
    if (types && !types.includes(item.type)) {
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    // Name match
    if (item.name.toLowerCase().includes(queryLower)) {
      score += 10;
      reasons.push("名前一致");
    }

    // Description match
    if (item.description.toLowerCase().includes(queryLower)) {
      score += 5;
      reasons.push("説明一致");
    }

    // Category match
    if (item.category.toLowerCase().includes(queryLower)) {
      score += 3;
      reasons.push("カテゴリ一致");
    }

    // Tag match
    const tagMatch = item.tags.find((t) => t.toLowerCase().includes(queryLower));
    if (tagMatch) {
      score += 2;
      reasons.push(`タグ: ${tagMatch}`);
    }

    // Official boost
    if (item.metrics.isOfficial) {
      score *= 1.2;
    }

    if (score > 0) {
      results.push({ item, score, reasons });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}
