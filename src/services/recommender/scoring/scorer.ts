/**
 * Scorer
 *
 * Calculates match scores for recommendations based on project information
 */

import { ENHANCED_SCORING_FLAGS } from "../../../config/enhanced-scoring-config.js";
import {
  SCORING_MULTIPLIERS,
  SCORING_THRESHOLDS,
  SCORING_WEIGHTS,
} from "../../../config/scoring-config.js";
import type { Recommendation } from "../../../types/domain-types.js";
import type { ScoreBreakdown, SimilarityMatrix } from "../../../types/scoring-types.js";
import type { ProjectInfo } from "../../../types/service-types.js";
import { matchGlob } from "../../../utils/glob-matcher.js";
import { calculateContextScore } from "./context-scorer.js";
import { calculateSimilarityScore, extractProjectTags } from "./similarity-scorer.js";

/**
 * Calculate match score for a recommendation item
 *
 * @param item - The recommendation item to score
 * @param project - The project information to match against
 * @param userQuery - Optional user search query
 * @param options - Optional scoring options
 * @returns Score, reasons, and optional breakdown
 */
export function calculateScore(
  item: Recommendation,
  project: ProjectInfo,
  userQuery?: string,
  options?: { similarityMatrix?: SimilarityMatrix },
): { score: number; reasons: string[]; breakdown?: ScoreBreakdown } {
  let score = 0;
  const reasons: string[] = [];

  const detection = item.detection;

  // 1. Language match
  if (detection.languages && detection.languages.length > 0) {
    const matches = detection.languages.filter((lang) =>
      project.languages.includes(lang.toLowerCase()),
    );
    if (matches.length > 0) {
      score += matches.length * SCORING_WEIGHTS.language;
      reasons.push(`言語: ${matches.join(", ")}`);
    }
  }

  // 2. Framework match
  if (detection.frameworks && detection.frameworks.length > 0) {
    const matches = detection.frameworks.filter((fw) =>
      project.frameworks.includes(fw.toLowerCase()),
    );
    if (matches.length > 0) {
      score += matches.length * SCORING_WEIGHTS.framework;
      reasons.push(`フレームワーク: ${matches.join(", ")}`);
    }
  }

  // 3. Dependency match
  if (detection.dependencies && detection.dependencies.length > 0) {
    const projectDepsLower = project.dependencies.map((d) => d.toLowerCase());
    const matches = detection.dependencies.filter((dep) =>
      projectDepsLower.includes(dep.toLowerCase()),
    );
    if (matches.length > 0) {
      score += matches.length * SCORING_WEIGHTS.dependency;
      reasons.push(`依存関係: ${matches.join(", ")}`);
    }
  }

  // 4. File pattern match
  if (detection.files && detection.files.length > 0) {
    const matches = detection.files.filter((pattern) =>
      project.files.some((file) => matchGlob(file, pattern)),
    );
    if (matches.length > 0) {
      score += matches.length * SCORING_WEIGHTS.file;
      reasons.push(`ファイル: ${matches.join(", ")}`);
    }
  }

  // 5. Keyword match (from user query)
  if (userQuery) {
    const queryLower = userQuery.toLowerCase();
    const keywords = detection.keywords || [];
    const tagMatches = [...keywords, ...item.tags].filter((kw) =>
      queryLower.includes(kw.toLowerCase()),
    );
    if (tagMatches.length > 0) {
      score += tagMatches.length * SCORING_WEIGHTS.keyword;
      reasons.push(`キーワード: ${[...new Set(tagMatches)].join(", ")}`);
    }

    // Also check name and description
    if (queryLower.includes(item.name.toLowerCase())) {
      score += SCORING_WEIGHTS.keyword * 2;
      reasons.push(`名前一致: ${item.name}`);
    }
  }

  // 6. Apply multipliers
  if (item.metrics.isOfficial) {
    score *= SCORING_MULTIPLIERS.official;
    if (reasons.length > 0) {
      reasons.push("公式");
    }
  }

  if (item.metrics.securityScore !== undefined) {
    if (item.metrics.securityScore >= SCORING_THRESHOLDS.highSecurityThreshold) {
      score *= SCORING_MULTIPLIERS.highSecurity;
    } else if (item.metrics.securityScore < SCORING_THRESHOLDS.lowSecurityThreshold) {
      score *= SCORING_MULTIPLIERS.lowSecurity;
    }
  }

  // Store base score (before context scoring)
  const baseScore = score;

  // 7. Context scoring (project size, monorepo, team scale)
  let contextScore = 0;
  const contextReasons: string[] = [];

  if (ENHANCED_SCORING_FLAGS.enableContextScoring && project.metadata) {
    const context = calculateContextScore(item, project.metadata);
    contextScore = context.score;
    contextReasons.push(...context.reasons);
  }

  // 8. Similarity scoring (tag co-occurrence)
  let similarityScore = 0;
  const similarityReasons: string[] = [];

  if (ENHANCED_SCORING_FLAGS.enableSimilarityScoring && options?.similarityMatrix) {
    const projectTags = extractProjectTags(project);
    const similarity = calculateSimilarityScore(item, projectTags, options.similarityMatrix);
    similarityScore = similarity.score;
    similarityReasons.push(...similarity.reasons);
  }

  // Combine scores
  const totalRawScore = score + contextScore + similarityScore;

  // Normalize score to 1-100 range
  const normalizedScore = normalizeScore(totalRawScore);

  // Build breakdown
  const breakdown: ScoreBreakdown = {
    baseScore,
    contextScore,
    similarityScore,
    qualityScore: 0, // Will be set by recommendation.service
    finalScore: normalizedScore,
  };

  return {
    score: normalizedScore,
    reasons: [...reasons, ...contextReasons, ...similarityReasons],
    breakdown,
  };
}

/**
 * Normalize raw score to 1-100 range
 *
 * @param rawScore - The raw calculated score
 * @returns Normalized score between 1 and 100
 */
function normalizeScore(rawScore: number): number {
  if (rawScore <= 0) return 1;

  // Convert to 1-100 scale based on expected max raw score
  const normalized = (rawScore / SCORING_THRESHOLDS.maxRawScore) * 100;

  // Clamp to 1-100 range
  return Math.round(Math.min(100, Math.max(1, normalized)));
}

/**
 * Get score indicator emoji and text
 *
 * @param score - The calculated score (1-100)
 * @returns Indicator string with emoji
 */
export function getScoreIndicator(score: number): string {
  if (score >= 80) return " ✅ 高適合";
  if (score >= 50) return " 👍 適合";
  if (score >= 20) return " 📝 参考";
  return "";
}
