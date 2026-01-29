/**
 * Scorer
 *
 * Calculates match scores for recommendations based on project information
 */

import {
  SCORING_MULTIPLIERS,
  SCORING_THRESHOLDS,
  SCORING_WEIGHTS,
} from "../../../config/scoring-config.js";
import type { Recommendation } from "../../../types/domain-types.js";
import type { ProjectInfo } from "../../../types/service-types.js";
import { matchGlob } from "../../../utils/glob-matcher.js";

/**
 * Calculate match score for a recommendation item
 *
 * @param item - The recommendation item to score
 * @param project - The project information to match against
 * @param userQuery - Optional user search query
 * @returns Score and reasons for the match
 */
export function calculateScore(
  item: Recommendation,
  project: ProjectInfo,
  userQuery?: string,
): { score: number; reasons: string[] } {
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

  return { score: Math.round(score * 100) / 100, reasons };
}

/**
 * Get score indicator emoji and text
 *
 * @param score - The calculated score
 * @returns Indicator string with emoji
 */
export function getScoreIndicator(score: number): string {
  if (score >= 10) return " ✅ 高適合";
  if (score >= 5) return " 👍 適合";
  if (score >= 2) return " 📝 参考";
  return "";
}
