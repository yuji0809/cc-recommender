import { describe, expect, test } from "vitest";
import { formatRecommendations, groupByType } from "../../src/services/recommender/formatters.js";
import type { Recommendation, ScoredRecommendation } from "../../src/types/index.js";

describe("Formatters", () => {
  // Mock data
  const mockRecommendation: Recommendation = {
    id: "test-plugin-1",
    type: "plugin",
    name: "Test Plugin",
    description: "A test plugin for TypeScript and React",
    category: "Development",
    tags: ["typescript", "react", "testing"],
    url: "https://example.com",
    author: {
      name: "Test Author",
      url: "https://example.com/author",
    },
    install: {
      method: "plugin",
      command: "npm install test-plugin",
    },
    detection: {
      languages: ["TypeScript", "JavaScript"],
      frameworks: ["React"],
      dependencies: ["react"],
      files: ["*.tsx"],
      keywords: ["typescript", "react"],
    },
    metrics: {
      source: "official",
      isOfficial: true,
      securityScore: 85,
    },
  };

  describe("groupByType", () => {
    describe("Normal operation", () => {
      test("should group recommendations by type", () => {
        const recommendations: ScoredRecommendation[] = [
          {
            item: { ...mockRecommendation, type: "plugin" },
            score: 10,
            reasons: [],
          },
          {
            item: { ...mockRecommendation, type: "mcp" },
            score: 8,
            reasons: [],
          },
          {
            item: { ...mockRecommendation, type: "skill" },
            score: 6,
            reasons: [],
          },
        ];
        const grouped = groupByType(recommendations);

        expect(grouped instanceof Map).toBe(true);

        for (const [type, items] of grouped.entries()) {
          expect(items.every((item) => item.item.type === type)).toBe(true);
        }
      });

      test("should create separate groups for each type", () => {
        const recommendations: ScoredRecommendation[] = [
          {
            item: { ...mockRecommendation, type: "plugin" },
            score: 10,
            reasons: [],
          },
          {
            item: { ...mockRecommendation, type: "mcp" },
            score: 8,
            reasons: [],
          },
          {
            item: { ...mockRecommendation, type: "skill" },
            score: 6,
            reasons: [],
          },
        ];

        const grouped = groupByType(recommendations);

        expect(grouped.size).toBe(3);
        expect(grouped.has("plugin")).toBe(true);
        expect(grouped.has("mcp")).toBe(true);
        expect(grouped.has("skill")).toBe(true);
      });

      test("should handle multiple items of same type", () => {
        const recommendations: ScoredRecommendation[] = [
          {
            item: { ...mockRecommendation, id: "1", type: "plugin" },
            score: 10,
            reasons: [],
          },
          {
            item: { ...mockRecommendation, id: "2", type: "plugin" },
            score: 8,
            reasons: [],
          },
        ];

        const grouped = groupByType(recommendations);

        expect(grouped.size).toBe(1);
        expect(grouped.get("plugin")?.length).toBe(2);
      });
    });

    describe("Boundary conditions", () => {
      test("should handle empty recommendations", () => {
        const grouped = groupByType([]);

        expect(grouped.size).toBe(0);
      });

      test("should handle single recommendation", () => {
        const recommendations: ScoredRecommendation[] = [
          {
            item: mockRecommendation,
            score: 10,
            reasons: [],
          },
        ];

        const grouped = groupByType(recommendations);

        expect(grouped.size).toBe(1);
      });
    });
  });

  describe("formatRecommendations", () => {
    describe("Normal operation", () => {
      test("should return message for empty recommendations", () => {
        const result = formatRecommendations([]);

        expect(result).toBe("プロジェクトに適した推薦が見つかりませんでした。");
      });

      test("should format single recommendation", () => {
        const recommendations: ScoredRecommendation[] = [
          {
            item: mockRecommendation,
            score: 10,
            reasons: ["言語: TypeScript"],
          },
        ];

        const result = formatRecommendations(recommendations);

        expect(result).toContain("Test Plugin");
        expect(result).toContain("スコア: 10");
        expect(result).toContain("言語: TypeScript");
      });

      test("should include installation command when available", () => {
        const recommendations: ScoredRecommendation[] = [
          {
            item: mockRecommendation,
            score: 10,
            reasons: [],
          },
        ];

        const result = formatRecommendations(recommendations);

        expect(result).toContain("npm install test-plugin");
      });

      test("should show URL when no installation command", () => {
        const recommendations: ScoredRecommendation[] = [
          {
            item: {
              ...mockRecommendation,
              install: { method: "manual" },
            },
            score: 10,
            reasons: [],
          },
        ];

        const result = formatRecommendations(recommendations);

        expect(result).toContain("https://example.com");
      });

      test("should mark official items", () => {
        const recommendations: ScoredRecommendation[] = [
          {
            item: mockRecommendation,
            score: 10,
            reasons: [],
          },
        ];

        const result = formatRecommendations(recommendations);

        expect(result).toContain("(公式)");
      });

      test("should limit items per type to 5", () => {
        const recommendations: ScoredRecommendation[] = Array.from({ length: 10 }, (_, i) => ({
          item: { ...mockRecommendation, id: `plugin-${i}`, name: `Plugin ${i}` },
          score: 10 - i,
          reasons: [],
        }));

        const result = formatRecommendations(recommendations);

        expect(result).toContain("他に 5 件の候補があります");
      });

      test("should group by type correctly", () => {
        const recommendations: ScoredRecommendation[] = [
          {
            item: { ...mockRecommendation, type: "plugin" },
            score: 10,
            reasons: [],
          },
          {
            item: { ...mockRecommendation, type: "mcp", name: "MCP Server" },
            score: 8,
            reasons: [],
          },
        ];

        const result = formatRecommendations(recommendations);

        expect(result).toContain("📦 プラグイン");
        expect(result).toContain("🔌 MCPサーバー");
      });
    });

    describe("Boundary conditions", () => {
      test("should truncate long descriptions", () => {
        const longDesc = "a".repeat(100);
        const recommendations: ScoredRecommendation[] = [
          {
            item: { ...mockRecommendation, description: longDesc },
            score: 10,
            reasons: [],
          },
        ];

        const result = formatRecommendations(recommendations);

        expect(result).toContain("...");
      });

      test("should handle empty reasons array", () => {
        const recommendations: ScoredRecommendation[] = [
          {
            item: mockRecommendation,
            score: 10,
            reasons: [],
          },
        ];

        const result = formatRecommendations(recommendations);

        expect(result).not.toContain("推薦理由:");
      });

      test("should show score indicators", () => {
        const highScore: ScoredRecommendation = {
          item: mockRecommendation,
          score: 85,
          reasons: [],
        };
        const midScore: ScoredRecommendation = {
          item: mockRecommendation,
          score: 60,
          reasons: [],
        };
        const lowScore: ScoredRecommendation = {
          item: mockRecommendation,
          score: 30,
          reasons: [],
        };

        const result1 = formatRecommendations([highScore]);
        const result2 = formatRecommendations([midScore]);
        const result3 = formatRecommendations([lowScore]);

        expect(result1).toContain("✅ 高適合");
        expect(result2).toContain("👍 適合");
        expect(result3).toContain("📝 参考");
      });
    });

    describe("Bonus recommendations", () => {
      test("should show bonus recommendations section when provided", () => {
        const displayedRec: ScoredRecommendation = {
          item: mockRecommendation,
          score: 10,
          reasons: ["言語: TypeScript"],
        };

        const bonusRec: ScoredRecommendation = {
          item: {
            ...mockRecommendation,
            id: "bonus-plugin",
            name: "Bonus Plugin",
            metrics: {
              ...mockRecommendation.metrics,
              stars: 500,
            },
          },
          score: 3,
          reasons: [],
        };

        const result = formatRecommendations([displayedRec], [displayedRec, bonusRec]);

        expect(result).toContain("🔥 人気・トレンド");
        expect(result).toContain("Bonus Plugin");
      });

      test("should not duplicate items in bonus section", () => {
        const rec: ScoredRecommendation = {
          item: mockRecommendation,
          score: 10,
          reasons: [],
        };

        const result = formatRecommendations([rec], [rec]);

        // Should only appear once (not in bonus section)
        const occurrences = (result.match(/Test Plugin/g) || []).length;
        expect(occurrences).toBe(1);
      });

      test("should prioritize official items in bonus section", () => {
        const displayedRec: ScoredRecommendation = {
          item: mockRecommendation,
          score: 10,
          reasons: [],
        };

        const officialBonus: ScoredRecommendation = {
          item: {
            ...mockRecommendation,
            id: "official-bonus",
            name: "Official Bonus",
            metrics: {
              ...mockRecommendation.metrics,
              isOfficial: true,
              stars: 100,
            },
          },
          score: 2,
          reasons: [],
        };

        const result = formatRecommendations([displayedRec], [displayedRec, officialBonus]);

        expect(result).toContain("Official Bonus");
        expect(result).toContain("公式推奨");
      });

      test("should show stars for popular items in bonus section", () => {
        const displayedRec: ScoredRecommendation = {
          item: mockRecommendation,
          score: 10,
          reasons: [],
        };

        const popularBonus: ScoredRecommendation = {
          item: {
            ...mockRecommendation,
            id: "popular-bonus",
            name: "Popular Bonus",
            metrics: {
              ...mockRecommendation.metrics,
              stars: 250,
            },
          },
          score: 2,
          reasons: [],
        };

        const result = formatRecommendations([displayedRec], [displayedRec, popularBonus]);

        expect(result).toContain("GitHub Stars: ⭐ 250");
      });

      test("should work without bonus recommendations", () => {
        const rec: ScoredRecommendation = {
          item: mockRecommendation,
          score: 10,
          reasons: [],
        };

        // No second parameter
        const result = formatRecommendations([rec]);

        expect(result).not.toContain("🔥 人気・トレンド");
        expect(result).toContain("Test Plugin");
      });

      test("should show high quality label for items with high security score", () => {
        const displayedRec: ScoredRecommendation = {
          item: mockRecommendation,
          score: 10,
          reasons: [],
        };

        const qualityBonus: ScoredRecommendation = {
          item: {
            ...mockRecommendation,
            id: "quality-bonus",
            name: "Quality Bonus",
            metrics: {
              ...mockRecommendation.metrics,
              isOfficial: false,
              stars: 50,
              securityScore: 90,
            },
          },
          score: 2,
          reasons: [],
        };

        const result = formatRecommendations([displayedRec], [displayedRec, qualityBonus]);

        expect(result).toContain("Quality Bonus");
        expect(result).toContain("高品質");
      });

      test("should show trending label for recently updated items", () => {
        const displayedRec: ScoredRecommendation = {
          item: mockRecommendation,
          score: 10,
          reasons: [],
        };

        const trendingBonus: ScoredRecommendation = {
          item: {
            ...mockRecommendation,
            id: "trending-bonus",
            name: "Trending Bonus",
            metrics: {
              ...mockRecommendation.metrics,
              isOfficial: false,
              stars: 50,
              securityScore: 70,
              lastUpdated: new Date().toISOString(), // Recently updated
            },
          },
          score: 2,
          reasons: [],
        };

        const result = formatRecommendations([displayedRec], [displayedRec, trendingBonus]);

        expect(result).toContain("Trending Bonus");
        expect(result).toContain("最近話題");
      });

      test("should show default label for items without special attributes", () => {
        const displayedRec: ScoredRecommendation = {
          item: mockRecommendation,
          score: 10,
          reasons: [],
        };

        const defaultBonus: ScoredRecommendation = {
          item: {
            ...mockRecommendation,
            id: "default-bonus",
            name: "Default Bonus",
            metrics: {
              ...mockRecommendation.metrics,
              isOfficial: false,
              stars: 50,
              securityScore: 70,
              lastUpdated: "2020-01-01", // Old update
            },
          },
          score: 2,
          reasons: [],
        };

        const result = formatRecommendations([displayedRec], [displayedRec, defaultBonus]);

        expect(result).toContain("Default Bonus");
        expect(result).toContain("おすすめ");
      });

      test("should prioritize recently updated items in bonus scoring", () => {
        const displayedRec: ScoredRecommendation = {
          item: mockRecommendation,
          score: 10,
          reasons: [],
        };

        const oldBonus: ScoredRecommendation = {
          item: {
            ...mockRecommendation,
            id: "old-bonus",
            name: "Old Bonus",
            metrics: {
              ...mockRecommendation.metrics,
              stars: 50, // Lower stars
              lastUpdated: "2020-01-01", // Old update
            },
          },
          score: 2,
          reasons: [],
        };

        const recentBonus: ScoredRecommendation = {
          item: {
            ...mockRecommendation,
            id: "recent-bonus",
            name: "Recent Bonus",
            metrics: {
              ...mockRecommendation.metrics,
              stars: 50,
              lastUpdated: new Date().toISOString(), // Recently updated
            },
          },
          score: 2,
          reasons: [],
        };

        const highStarBonus: ScoredRecommendation = {
          item: {
            ...mockRecommendation,
            id: "highstar-bonus",
            name: "High Star Bonus",
            metrics: {
              ...mockRecommendation.metrics,
              stars: 200, // High stars
            },
          },
          score: 2,
          reasons: [],
        };

        const result = formatRecommendations(
          [displayedRec],
          [displayedRec, oldBonus, recentBonus, highStarBonus],
        );

        // Recently updated item and high star item should appear (top 2)
        // Old item should not appear as it has lowest bonus score
        // Bonus scores: oldBonus = 5, recentBonus = 5+20=25, highStarBonus = 20
        const recentIndex = result.indexOf("Recent Bonus");
        const oldIndex = result.indexOf("Old Bonus");
        expect(recentIndex).toBeGreaterThan(-1);
        expect(oldIndex).toBe(-1); // Only top 2 items shown
      });
    });
  });
});
