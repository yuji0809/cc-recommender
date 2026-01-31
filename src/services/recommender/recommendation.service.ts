/**
 * Recommendation Service
 *
 * Main service for generating recommendations based on project analysis
 */

import type { Recommendation, RecommendationDatabase } from "../../types/domain-types.js";
import type { ProjectInfo, ScoredRecommendation } from "../../types/service-types.js";
import { calculateQualityScore } from "./quality-scorer.js";
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

    const { score: matchScore, reasons } = calculateScore(item, project, userQuery);

    // Calculate quality score (0-100)
    const qualityScore = calculateQualityScore(item).total;

    // Combine match score and quality score
    // Match score is primary (0-100), quality score is a bonus (0-20)
    const finalScore = matchScore + qualityScore * 0.2;

    if (finalScore >= minScore) {
      results.push({ item, score: finalScore, reasons });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Return top results
  return results.slice(0, maxResults);
}
