/**
 * Similarity Scorer
 *
 * Calculates semantic similarity scores based on tag co-occurrence
 */

import { SIMILARITY_THRESHOLDS } from "../../../config/enhanced-scoring-config.js";
import type { Recommendation, RecommendationDatabase } from "../../../types/domain-types.js";
import type { SimilarityMatrix } from "../../../types/scoring-types.js";
import type { ProjectInfo } from "../../../types/service-types.js";

/**
 * Extract tags from project information
 *
 * @param project - The project information
 * @returns Array of normalized tags (languages + frameworks + top 10 dependencies)
 */
export function extractProjectTags(project: ProjectInfo): string[] {
  const tags: string[] = [
    ...project.languages,
    ...project.frameworks,
    ...project.dependencies.slice(0, 10),
  ];

  // Normalize to lowercase for consistent matching
  return tags.map((tag) => tag.toLowerCase());
}

/**
 * Increment co-occurrence count bidirectionally
 */
function incrementCooccurrence(
  cooccurrence: Map<string, Map<string, number>>,
  tag1: string,
  tag2: string,
): void {
  // Initialize maps if needed
  if (!cooccurrence.has(tag1)) {
    cooccurrence.set(tag1, new Map());
  }
  if (!cooccurrence.has(tag2)) {
    cooccurrence.set(tag2, new Map());
  }

  // Increment bidirectional counts
  const count1to2 = cooccurrence.get(tag1)?.get(tag2) || 0;
  const count2to1 = cooccurrence.get(tag2)?.get(tag1) || 0;

  cooccurrence.get(tag1)?.set(tag2, count1to2 + 1);
  cooccurrence.get(tag2)?.set(tag1, count2to1 + 1);
}

/**
 * Build similarity matrix from recommendation database
 *
 * @param database - The recommendations database
 * @returns Similarity matrix with co-occurrence counts
 */
export function buildSimilarityMatrix(database: RecommendationDatabase): SimilarityMatrix {
  const cooccurrence = new Map<string, Map<string, number>>();
  const tagCounts = new Map<string, number>();

  for (const item of database.items) {
    // Normalize tags to lowercase and remove duplicates
    const tags = [...new Set(item.tags.map((t) => t.toLowerCase()))];

    // Count each tag
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }

    // Count tag pairs (co-occurrence)
    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        incrementCooccurrence(cooccurrence, tags[i], tags[j]);
      }
    }
  }

  return { cooccurrence, tagCounts };
}

/**
 * Calculate Jaccard similarity between two tags
 *
 * Jaccard similarity = |intersection| / |union|
 *
 * @param tag1 - First tag
 * @param tag2 - Second tag
 * @param cooccurrence - Co-occurrence map
 * @param tagCounts - Tag counts map
 * @returns Jaccard similarity score (0-1)
 */
function calculateJaccardSimilarity(
  tag1: string,
  tag2: string,
  cooccurrence: Map<string, Map<string, number>>,
  tagCounts: Map<string, number>,
): number {
  // Same tag = perfect similarity
  if (tag1 === tag2) return 1.0;

  // Get co-occurrence count
  const cooccur = cooccurrence.get(tag1)?.get(tag2) || 0;

  // If co-occurrence is below threshold, consider them unrelated
  if (cooccur < SIMILARITY_THRESHOLDS.minCooccurrence) {
    return 0;
  }

  // Get individual counts
  const count1 = tagCounts.get(tag1) || 0;
  const count2 = tagCounts.get(tag2) || 0;

  // Calculate Jaccard: |A ∩ B| / |A ∪ B|
  const intersection = cooccur;
  const union = count1 + count2 - cooccur;

  return union > 0 ? intersection / union : 0;
}

/**
 * Calculate similarity score between item tags and project tags
 *
 * @param item - The recommendation item
 * @param projectTags - Tags extracted from project (already normalized)
 * @param matrix - Similarity matrix
 * @returns Similarity score and reasons
 */
export function calculateSimilarityScore(
  item: Recommendation,
  projectTags: string[],
  matrix: SimilarityMatrix,
): { score: number; reasons: string[] } {
  let totalSimilarity = 0;
  const reasons: string[] = [];

  // Normalize item tags to lowercase
  const itemTags = item.tags.map((t) => t.toLowerCase());

  // Calculate similarity for each pair
  for (const projectTag of projectTags) {
    for (const itemTag of itemTags) {
      const similarity = calculateJaccardSimilarity(
        projectTag,
        itemTag,
        matrix.cooccurrence,
        matrix.tagCounts,
      );

      // Only add if above threshold
      if (similarity >= SIMILARITY_THRESHOLDS.minJaccardSimilarity) {
        totalSimilarity += similarity;
        reasons.push(`類似タグ: ${projectTag} ≈ ${itemTag}`);
      }
    }
  }

  // Cap at max bonus
  const score = Math.min(totalSimilarity, SIMILARITY_THRESHOLDS.maxSimilarityBonus);

  return { score, reasons };
}
