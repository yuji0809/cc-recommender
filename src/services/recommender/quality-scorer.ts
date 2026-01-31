/**
 * Quality Scorer
 *
 * Calculates quality scores for skills based on various metrics
 */

import type { Recommendation } from "../../types/index.js";

export type QualityScore = {
  total: number;
  breakdown: {
    official: number;
    stars: number;
    freshness: number;
    source: number;
  };
};

/**
 * Calculate quality score for a skill
 *
 * Score components:
 * - Official status: 0-40 points (40 for official, 0 for community)
 * - Stars: 0-30 points (logarithmic scale)
 * - Freshness: 0-20 points (based on last updated)
 * - Source priority: 0-10 points (official > curated > community)
 *
 * Total: 0-100 points
 */
export function calculateQualityScore(skill: Recommendation): QualityScore {
  const breakdown = {
    official: calculateOfficialScore(skill),
    stars: calculateStarsScore(skill),
    freshness: calculateFreshnessScore(skill),
    source: calculateSourceScore(skill),
  };

  const total = breakdown.official + breakdown.stars + breakdown.freshness + breakdown.source;

  return {
    total,
    breakdown,
  };
}

/**
 * Official status score (0-40 points)
 */
function calculateOfficialScore(skill: Recommendation): number {
  if (skill.metrics.isOfficial) {
    return 40;
  }
  return 0;
}

/**
 * Stars score (0-30 points, logarithmic scale)
 */
function calculateStarsScore(skill: Recommendation): number {
  const stars = skill.metrics.stars ?? 0;

  if (stars === 0) {
    return 0;
  }

  // Logarithmic scale: log10(stars + 1) * 10
  // 0 stars = 0 points
  // 10 stars = 10 points
  // 100 stars = 20 points
  // 1000 stars = 30 points
  // 10000+ stars = 30 points (capped)

  const score = Math.log10(stars + 1) * 10;
  return Math.min(score, 30);
}

/**
 * Freshness score (0-20 points)
 */
function calculateFreshnessScore(skill: Recommendation): number {
  const lastUpdated = skill.metrics.lastUpdated;

  if (!lastUpdated) {
    return 10; // Neutral score if unknown
  }

  const now = new Date();
  const updated = new Date(lastUpdated);
  const daysSinceUpdate = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));

  // Scoring:
  // < 30 days = 20 points
  // < 90 days = 15 points
  // < 180 days = 10 points
  // < 365 days = 5 points
  // > 365 days = 0 points

  if (daysSinceUpdate < 30) {
    return 20;
  }
  if (daysSinceUpdate < 90) {
    return 15;
  }
  if (daysSinceUpdate < 180) {
    return 10;
  }
  if (daysSinceUpdate < 365) {
    return 5;
  }
  return 0;
}

/**
 * Source priority score (0-10 points)
 */
function calculateSourceScore(skill: Recommendation): number {
  switch (skill.metrics.source) {
    case "official":
      return 10;
    case "awesome-list":
      return 7;
    case "community":
      return 5;
    default:
      return 5;
  }
}

/**
 * Sort skills by quality score (descending)
 */
export function sortByQualityScore(skills: Recommendation[]): Recommendation[] {
  return [...skills].sort((a, b) => {
    const scoreA = calculateQualityScore(a).total;
    const scoreB = calculateQualityScore(b).total;
    return scoreB - scoreA;
  });
}

/**
 * Get quality tier based on score
 */
export function getQualityTier(score: number): "excellent" | "good" | "fair" | "low" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "low";
}

/**
 * Get quality badge emoji
 */
export function getQualityBadge(score: number): string {
  if (score >= 80) return "⭐⭐⭐";
  if (score >= 60) return "⭐⭐";
  if (score >= 40) return "⭐";
  return "";
}
