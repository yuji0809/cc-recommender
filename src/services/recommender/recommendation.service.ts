/**
 * Recommendation Service
 *
 * Main service for generating recommendations based on project analysis
 */

import type { Recommendation, RecommendationDatabase } from "../../types/domain-types.js";
import type { ProjectInfo, ScoredRecommendation } from "../../types/service-types.js";
import { calculateScore } from "./scoring/scorer.js";

/** Options for recommend function */
export type RecommendOptions = {
  /** Maximum number of results */
  maxResults?: number;
  /** Minimum score threshold */
  minScore?: number;
  /** Filter by types */
  types?: Recommendation["type"][];
};

/**
 * Generate recommendations based on project analysis
 *
 * @param database - The recommendations database
 * @param project - The project information
 * @param userQuery - Optional user search query
 * @param options - Recommendation options
 * @returns List of scored recommendations
 */
export function recommend(
  database: RecommendationDatabase,
  project: ProjectInfo,
  userQuery?: string,
  options: RecommendOptions = {},
): ScoredRecommendation[] {
  const { maxResults = 20, minScore = 1, types } = options;

  const results: ScoredRecommendation[] = [];

  for (const item of database.items) {
    // Filter by type if specified
    if (types && !types.includes(item.type)) {
      continue;
    }

    const { score, reasons } = calculateScore(item, project, userQuery);

    if (score >= minScore) {
      results.push({ item, score, reasons });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Return top results
  return results.slice(0, maxResults);
}
