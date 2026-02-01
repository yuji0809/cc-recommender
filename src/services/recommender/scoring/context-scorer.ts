/**
 * Context Scorer
 *
 * Calculates context-based scores for recommendations
 * (project size, team scale, monorepo, etc.)
 */

import { CONTEXT_SCORE_WEIGHTS } from "../../../config/enhanced-scoring-config.js";
import type { Recommendation } from "../../../types/domain-types.js";
import type { ProjectMetadata } from "../../../types/scoring-types.js";

/**
 * Calculate context score for a recommendation
 *
 * @param item - The recommendation item
 * @param metadata - Project metadata
 * @returns Score and reasons
 */
export function calculateContextScore(
  item: Recommendation,
  metadata: ProjectMetadata,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Monorepo bonus
  if (metadata.kind === "monorepo") {
    const isMonorepoTool = item.tags.some((tag) =>
      ["monorepo", "workspace", "nx", "turborepo", "lerna", "pnpm"].includes(tag.toLowerCase()),
    );

    if (isMonorepoTool) {
      score += CONTEXT_SCORE_WEIGHTS.monorepoBonus;
      reasons.push("モノレポ対応");
    }
  }

  // 2. Project size match
  const sizeScore = calculateSizeMatchScore(item, metadata);
  if (sizeScore > 0) {
    score += sizeScore;
    reasons.push(`${metadata.size}プロジェクト向け`);
  }

  // 3. Team size match
  const teamScore = calculateTeamSizeScore(item, metadata);
  if (teamScore > 0) {
    score += teamScore;
    reasons.push("チーム規模適合");
  }

  return { score, reasons };
}

/**
 * Calculate score based on project size match
 *
 * @param item - The recommendation item
 * @param metadata - Project metadata
 * @returns Size match score
 */
function calculateSizeMatchScore(item: Recommendation, metadata: ProjectMetadata): number {
  // Enterprise/large project tools
  const enterpriseTools = ["ci/cd", "monitoring", "testing", "documentation"];

  if (metadata.size === "enterprise" || metadata.size === "large") {
    const hasEnterpriseTag = item.tags.some((tag) =>
      enterpriseTools.some((et) => tag.toLowerCase().includes(et)),
    );

    if (hasEnterpriseTag) {
      return CONTEXT_SCORE_WEIGHTS.sizeMatch;
    }
  }

  // Small project tools
  const smallTools = ["quick-start", "beginner", "simple", "lightweight"];

  if (metadata.size === "small") {
    const hasSmallTag = item.tags.some((tag) =>
      smallTools.some((st) => tag.toLowerCase().includes(st)),
    );

    if (hasSmallTag) {
      return CONTEXT_SCORE_WEIGHTS.sizeMatch;
    }
  }

  return 0;
}

/**
 * Calculate score based on team size match
 *
 * @param item - The recommendation item
 * @param metadata - Project metadata
 * @returns Team size match score
 */
function calculateTeamSizeScore(item: Recommendation, metadata: ProjectMetadata): number {
  // Collaboration tools for teams
  const collaborationTools = ["collaboration", "team", "review", "workflow"];

  if (metadata.estimatedTeamSize > 5) {
    const hasCollabTag = item.tags.some((tag) =>
      collaborationTools.some((ct) => tag.toLowerCase().includes(ct)),
    );

    if (hasCollabTag) {
      return CONTEXT_SCORE_WEIGHTS.teamSizeMatch;
    }
  }

  return 0;
}
