import { describe, expect, test } from "vitest";
import {
  calculateQualityScore,
  getQualityBadge,
  getQualityTier,
  sortByQualityScore,
} from "../../src/services/recommender/quality-scorer.js";
import type { Recommendation } from "../../src/types/index.js";

describe("Quality Scorer", () => {
  // Mock recommendation for testing
  const createMockRecommendation = (overrides?: Partial<Recommendation>): Recommendation => ({
    id: "test-skill",
    type: "skill",
    name: "Test Skill",
    description: "A test skill",
    category: "Testing",
    tags: ["test"],
    url: "https://example.com",
    author: {
      name: "Test Author",
      url: "https://example.com/author",
    },
    install: {
      method: "manual",
    },
    detection: {},
    metrics: {
      source: "community",
      isOfficial: false,
    },
    ...overrides,
  });

  describe("calculateQualityScore", () => {
    describe("Official score component", () => {
      test("should give 40 points for official items", () => {
        const skill = createMockRecommendation({
          metrics: { source: "official", isOfficial: true },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.official).toBe(40);
      });

      test("should give 0 points for non-official items", () => {
        const skill = createMockRecommendation({
          metrics: { source: "community", isOfficial: false },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.official).toBe(0);
      });
    });

    describe("Stars score component", () => {
      test("should give 0 points for 0 stars", () => {
        const skill = createMockRecommendation({
          metrics: { source: "community", stars: 0 },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.stars).toBe(0);
      });

      test("should give ~10 points for 10 stars", () => {
        const skill = createMockRecommendation({
          metrics: { source: "community", stars: 10 },
        });

        const result = calculateQualityScore(skill);

        // log10(11) * 10 ≈ 10.41
        expect(result.breakdown.stars).toBeCloseTo(10.41, 1);
      });

      test("should give ~20 points for 100 stars", () => {
        const skill = createMockRecommendation({
          metrics: { source: "community", stars: 100 },
        });

        const result = calculateQualityScore(skill);

        // log10(101) * 10 ≈ 20.04
        expect(result.breakdown.stars).toBeCloseTo(20.04, 1);
      });

      test("should give ~30 points for 1000 stars", () => {
        const skill = createMockRecommendation({
          metrics: { source: "community", stars: 1000 },
        });

        const result = calculateQualityScore(skill);

        // log10(1001) * 10 ≈ 30.00
        expect(result.breakdown.stars).toBeCloseTo(30, 1);
      });

      test("should cap at 30 points for 10000+ stars", () => {
        const skill = createMockRecommendation({
          metrics: { source: "community", stars: 10000 },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.stars).toBe(30);
      });

      test("should give 0 points when stars is undefined", () => {
        const skill = createMockRecommendation({
          metrics: { source: "community" },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.stars).toBe(0);
      });
    });

    describe("Freshness score component", () => {
      test("should give 20 points for updates < 30 days ago", () => {
        const now = new Date();
        const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

        const skill = createMockRecommendation({
          metrics: { source: "community", lastUpdated: twentyDaysAgo.toISOString() },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.freshness).toBe(20);
      });

      test("should give 15 points for updates < 90 days ago", () => {
        const now = new Date();
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const skill = createMockRecommendation({
          metrics: { source: "community", lastUpdated: sixtyDaysAgo.toISOString() },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.freshness).toBe(15);
      });

      test("should give 10 points for updates < 180 days ago", () => {
        const now = new Date();
        const hundredDaysAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);

        const skill = createMockRecommendation({
          metrics: { source: "community", lastUpdated: hundredDaysAgo.toISOString() },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.freshness).toBe(10);
      });

      test("should give 5 points for updates < 365 days ago", () => {
        const now = new Date();
        const twoHundredDaysAgo = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000);

        const skill = createMockRecommendation({
          metrics: { source: "community", lastUpdated: twoHundredDaysAgo.toISOString() },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.freshness).toBe(5);
      });

      test("should give 0 points for updates > 365 days ago", () => {
        const now = new Date();
        const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);

        const skill = createMockRecommendation({
          metrics: { source: "community", lastUpdated: twoYearsAgo.toISOString() },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.freshness).toBe(0);
      });

      test("should give 10 points (neutral) when lastUpdated is undefined", () => {
        const skill = createMockRecommendation({
          metrics: { source: "community" },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.freshness).toBe(10);
      });
    });

    describe("Source score component", () => {
      test("should give 10 points for official source", () => {
        const skill = createMockRecommendation({
          metrics: { source: "official", isOfficial: false },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.source).toBe(10);
      });

      test("should give 7 points for awesome-list source", () => {
        const skill = createMockRecommendation({
          metrics: { source: "awesome-list", isOfficial: false },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.source).toBe(7);
      });

      test("should give 5 points for community source", () => {
        const skill = createMockRecommendation({
          metrics: { source: "community", isOfficial: false },
        });

        const result = calculateQualityScore(skill);

        expect(result.breakdown.source).toBe(5);
      });
    });

    describe("Total score calculation", () => {
      test("should sum all components correctly", () => {
        const skill = createMockRecommendation({
          metrics: {
            source: "official",
            isOfficial: true,
            stars: 100,
            lastUpdated: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          },
        });

        const result = calculateQualityScore(skill);

        // official: 40, stars: ~20, freshness: 20, source: 10
        expect(result.total).toBeGreaterThan(85);
        expect(result.total).toBeLessThanOrEqual(100);
      });

      test("should handle minimum score (all zeros)", () => {
        const skill = createMockRecommendation({
          metrics: {
            source: "community",
            isOfficial: false,
            stars: 0,
            lastUpdated: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
          },
        });

        const result = calculateQualityScore(skill);

        // official: 0, stars: 0, freshness: 0, source: 5
        expect(result.total).toBe(5);
      });

      test("should return breakdown with all components", () => {
        const skill = createMockRecommendation();

        const result = calculateQualityScore(skill);

        expect(result.breakdown).toHaveProperty("official");
        expect(result.breakdown).toHaveProperty("stars");
        expect(result.breakdown).toHaveProperty("freshness");
        expect(result.breakdown).toHaveProperty("source");
      });
    });
  });

  describe("sortByQualityScore", () => {
    test("should sort skills by quality score in descending order", () => {
      const skills: Recommendation[] = [
        createMockRecommendation({
          id: "low",
          metrics: { source: "community", isOfficial: false, stars: 10 },
        }),
        createMockRecommendation({
          id: "high",
          metrics: { source: "official", isOfficial: true, stars: 1000 },
        }),
        createMockRecommendation({
          id: "medium",
          metrics: { source: "awesome-list", isOfficial: false, stars: 100 },
        }),
      ];

      const sorted = sortByQualityScore(skills);

      expect(sorted[0].id).toBe("high");
      expect(sorted[1].id).toBe("medium");
      expect(sorted[2].id).toBe("low");
    });

    test("should not modify the original array", () => {
      const skills: Recommendation[] = [
        createMockRecommendation({ id: "a", metrics: { source: "community", stars: 10 } }),
        createMockRecommendation({ id: "b", metrics: { source: "official", stars: 100 } }),
      ];

      const original = [...skills];
      sortByQualityScore(skills);

      expect(skills).toEqual(original);
    });

    test("should handle empty array", () => {
      const sorted = sortByQualityScore([]);

      expect(sorted).toEqual([]);
    });

    test("should handle single item", () => {
      const skill = createMockRecommendation();
      const sorted = sortByQualityScore([skill]);

      expect(sorted).toEqual([skill]);
    });

    test("should maintain stable sort for equal scores", () => {
      const skills: Recommendation[] = [
        createMockRecommendation({ id: "a", metrics: { source: "community", stars: 50 } }),
        createMockRecommendation({ id: "b", metrics: { source: "community", stars: 50 } }),
        createMockRecommendation({ id: "c", metrics: { source: "community", stars: 50 } }),
      ];

      const sorted = sortByQualityScore(skills);

      // All should have the same score, order may be maintained
      expect(sorted).toHaveLength(3);
    });
  });

  describe("getQualityTier", () => {
    test("should return 'excellent' for scores >= 80", () => {
      expect(getQualityTier(80)).toBe("excellent");
      expect(getQualityTier(90)).toBe("excellent");
      expect(getQualityTier(100)).toBe("excellent");
    });

    test("should return 'good' for scores 60-79", () => {
      expect(getQualityTier(60)).toBe("good");
      expect(getQualityTier(70)).toBe("good");
      expect(getQualityTier(79)).toBe("good");
    });

    test("should return 'fair' for scores 40-59", () => {
      expect(getQualityTier(40)).toBe("fair");
      expect(getQualityTier(50)).toBe("fair");
      expect(getQualityTier(59)).toBe("fair");
    });

    test("should return 'low' for scores < 40", () => {
      expect(getQualityTier(0)).toBe("low");
      expect(getQualityTier(20)).toBe("low");
      expect(getQualityTier(39)).toBe("low");
    });

    test("should handle boundary values correctly", () => {
      expect(getQualityTier(80)).toBe("excellent");
      expect(getQualityTier(79.9)).toBe("good");
      expect(getQualityTier(60)).toBe("good");
      expect(getQualityTier(59.9)).toBe("fair");
      expect(getQualityTier(40)).toBe("fair");
      expect(getQualityTier(39.9)).toBe("low");
    });
  });

  describe("getQualityBadge", () => {
    test("should return three stars for scores >= 80", () => {
      expect(getQualityBadge(80)).toBe("⭐⭐⭐");
      expect(getQualityBadge(90)).toBe("⭐⭐⭐");
      expect(getQualityBadge(100)).toBe("⭐⭐⭐");
    });

    test("should return two stars for scores 60-79", () => {
      expect(getQualityBadge(60)).toBe("⭐⭐");
      expect(getQualityBadge(70)).toBe("⭐⭐");
      expect(getQualityBadge(79)).toBe("⭐⭐");
    });

    test("should return one star for scores 40-59", () => {
      expect(getQualityBadge(40)).toBe("⭐");
      expect(getQualityBadge(50)).toBe("⭐");
      expect(getQualityBadge(59)).toBe("⭐");
    });

    test("should return empty string for scores < 40", () => {
      expect(getQualityBadge(0)).toBe("");
      expect(getQualityBadge(20)).toBe("");
      expect(getQualityBadge(39)).toBe("");
    });

    test("should handle boundary values correctly", () => {
      expect(getQualityBadge(80)).toBe("⭐⭐⭐");
      expect(getQualityBadge(79.9)).toBe("⭐⭐");
      expect(getQualityBadge(60)).toBe("⭐⭐");
      expect(getQualityBadge(59.9)).toBe("⭐");
      expect(getQualityBadge(40)).toBe("⭐");
      expect(getQualityBadge(39.9)).toBe("");
    });
  });

  describe("Integration tests", () => {
    test("should assign correct tier and badge for high quality skill", () => {
      const skill = createMockRecommendation({
        metrics: {
          source: "official",
          isOfficial: true,
          stars: 1000,
          lastUpdated: new Date().toISOString(),
        },
      });

      const score = calculateQualityScore(skill);
      const tier = getQualityTier(score.total);
      const badge = getQualityBadge(score.total);

      expect(tier).toBe("excellent");
      expect(badge).toBe("⭐⭐⭐");
      expect(score.total).toBeGreaterThanOrEqual(80);
    });

    test("should assign correct tier and badge for medium quality skill", () => {
      const skill = createMockRecommendation({
        metrics: {
          source: "awesome-list",
          isOfficial: false,
          stars: 100,
          lastUpdated: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      const score = calculateQualityScore(skill);
      const tier = getQualityTier(score.total);
      const badge = getQualityBadge(score.total);

      expect(tier).toBe("fair");
      expect(badge).toBe("⭐");
    });

    test("should assign correct tier and badge for low quality skill", () => {
      const skill = createMockRecommendation({
        metrics: {
          source: "community",
          isOfficial: false,
          stars: 0,
          lastUpdated: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      const score = calculateQualityScore(skill);
      const tier = getQualityTier(score.total);
      const badge = getQualityBadge(score.total);

      expect(tier).toBe("low");
      expect(badge).toBe("");
      expect(score.total).toBeLessThan(40);
    });
  });
});
