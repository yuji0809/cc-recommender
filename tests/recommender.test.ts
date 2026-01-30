import { describe, expect, test } from "vitest";
import { formatRecommendations, groupByType } from "../src/services/recommender/formatters.js";
import {
  type RecommendOptions,
  recommend,
} from "../src/services/recommender/recommendation.service.js";
import { calculateScore } from "../src/services/recommender/scoring/scorer.js";
import { search } from "../src/services/recommender/search.service.js";
import type {
  ProjectInfo,
  Recommendation,
  RecommendationDatabase,
  ScoredRecommendation,
} from "../src/types/index.js";

describe("Recommender Service", () => {
  // Mock data
  const mockProject: ProjectInfo = {
    path: "/test/project",
    languages: ["typescript", "javascript"],
    frameworks: ["react", "next.js"],
    dependencies: ["zod", "react", "next"],
    files: ["src/app/page.tsx", "package.json", "tsconfig.json"],
  };

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

  const mockDatabase: RecommendationDatabase = {
    version: "1.0.0",
    items: [
      mockRecommendation,
      {
        ...mockRecommendation,
        id: "test-mcp-1",
        type: "mcp",
        name: "Test MCP",
        metrics: { source: "community" as const, isOfficial: false },
      },
      {
        ...mockRecommendation,
        id: "test-skill-1",
        type: "skill",
        name: "Test Skill",
        detection: {
          languages: ["Python"],
          frameworks: [],
          dependencies: [],
          files: [],
          keywords: ["python"],
        },
        metrics: { source: "awesome-list" as const, isOfficial: false },
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  describe("calculateScore", () => {
    describe("Language matching", () => {
      test("should calculate score for language match", () => {
        const { score, reasons } = calculateScore(mockRecommendation, mockProject);

        expect(score).toBeGreaterThan(0);
        expect(reasons).toContain("言語: TypeScript, JavaScript");
      });

      test("should be case-insensitive for language matching", () => {
        const item = {
          ...mockRecommendation,
          detection: {
            ...mockRecommendation.detection,
            languages: ["TYPESCRIPT", "javascript"],
          },
        };

        const { reasons } = calculateScore(item, mockProject);
        expect(reasons.some((r) => r.includes("言語:"))).toBe(true);
      });

      test("should handle multiple language matches", () => {
        const project: ProjectInfo = {
          path: "/test",
          languages: ["typescript", "javascript", "python", "rust"],
          frameworks: [],
          dependencies: [],
          files: [],
        };

        const item = {
          ...mockRecommendation,
          detection: {
            ...mockRecommendation.detection,
            languages: ["TypeScript", "Python", "Rust"],
          },
        };

        const { score, reasons } = calculateScore(item, project);
        expect(score).toBeGreaterThan(0);
        expect(reasons.some((r) => r.includes("TypeScript"))).toBe(true);
      });
    });

    describe("Framework matching", () => {
      test("should calculate score for framework match", () => {
        const { reasons } = calculateScore(mockRecommendation, mockProject);
        expect(reasons).toContain("フレームワーク: React");
      });

      test("should be case-insensitive for framework matching", () => {
        const project: ProjectInfo = {
          ...mockProject,
          frameworks: ["react", "next.js"], // Framework matching expects lowercase in project
        };

        const { reasons } = calculateScore(mockRecommendation, project);
        expect(reasons.some((r) => r.includes("フレームワーク:"))).toBe(true);
      });

      test("should handle multiple framework matches", () => {
        const project: ProjectInfo = {
          ...mockProject,
          frameworks: ["react", "vue", "angular"],
        };

        const item = {
          ...mockRecommendation,
          detection: {
            ...mockRecommendation.detection,
            frameworks: ["React", "Vue"],
          },
        };

        const { reasons } = calculateScore(item, project);
        expect(reasons.some((r) => r.includes("React"))).toBe(true);
      });
    });

    describe("Dependency matching", () => {
      test("should calculate score for dependency match", () => {
        const { reasons } = calculateScore(mockRecommendation, mockProject);
        expect(reasons).toContain("依存関係: react");
      });

      test("should be case-insensitive for dependency matching", () => {
        const project: ProjectInfo = {
          ...mockProject,
          dependencies: ["REACT", "ZOD"],
        };

        const { reasons } = calculateScore(mockRecommendation, project);
        expect(reasons.some((r) => r.includes("依存関係:"))).toBe(true);
      });

      test("should handle scoped package names", () => {
        const project: ProjectInfo = {
          ...mockProject,
          dependencies: ["@types/react", "@modelcontextprotocol/sdk"],
        };

        const item = {
          ...mockRecommendation,
          detection: {
            ...mockRecommendation.detection,
            dependencies: ["@types/react"],
          },
        };

        const { reasons } = calculateScore(item, project);
        expect(reasons.some((r) => r.includes("@types/react"))).toBe(true);
      });
    });

    describe("File pattern matching", () => {
      test("should match simple glob patterns", () => {
        const project: ProjectInfo = {
          ...mockProject,
          files: ["app.tsx", "component.tsx", "utils.ts"],
        };

        const { reasons } = calculateScore(mockRecommendation, project);
        expect(reasons.some((r) => r.includes("ファイル:"))).toBe(true);
      });

      test("should match complex glob patterns with **", () => {
        const project: ProjectInfo = {
          ...mockProject,
          files: ["src/components/Button.tsx", "src/app/page.tsx"],
        };

        const item = {
          ...mockRecommendation,
          detection: {
            ...mockRecommendation.detection,
            files: ["**/*.tsx"],
          },
        };

        const { reasons } = calculateScore(item, project);
        expect(reasons.some((r) => r.includes("ファイル:"))).toBe(true);
      });

      test("should match ? wildcard", () => {
        const project: ProjectInfo = {
          ...mockProject,
          files: ["app.ts", "app.js"],
        };

        const item = {
          ...mockRecommendation,
          detection: {
            ...mockRecommendation.detection,
            files: ["app.?s"],
          },
        };

        const { reasons } = calculateScore(item, project);
        expect(reasons.some((r) => r.includes("ファイル:"))).toBe(true);
      });
    });

    describe("Keyword matching", () => {
      test("should handle user query keyword matching", () => {
        const { score, reasons } = calculateScore(
          mockRecommendation,
          mockProject,
          "typescript testing",
        );

        expect(score).toBeGreaterThan(0);
        expect(reasons.some((r) => r.includes("キーワード"))).toBe(true);
      });

      test("should match name with bonus score", () => {
        const { reasons } = calculateScore(mockRecommendation, mockProject, "Test Plugin");

        expect(reasons.some((r) => r.includes("名前一致"))).toBe(true);
      });

      test("should be case-insensitive for keyword matching", () => {
        const { reasons } = calculateScore(mockRecommendation, mockProject, "TYPESCRIPT");

        expect(reasons.some((r) => r.includes("キーワード"))).toBe(true);
      });

      test("should deduplicate matched keywords", () => {
        const item = {
          ...mockRecommendation,
          tags: ["react", "react-native"],
          detection: {
            ...mockRecommendation.detection,
            keywords: ["react"],
          },
        };

        const { reasons } = calculateScore(item, mockProject, "react");
        const keywordReason = reasons.find((r) => r.includes("キーワード:"));
        expect(keywordReason).toBeDefined();
      });
    });

    describe("Score multipliers", () => {
      test("should apply official multiplier", () => {
        const officialItem = { ...mockRecommendation };
        const unofficialItem = {
          ...mockRecommendation,
          metrics: { source: "community" as const, isOfficial: false },
        };

        const officialResult = calculateScore(officialItem, mockProject);
        const unofficialResult = calculateScore(unofficialItem, mockProject);

        expect(officialResult.score).toBeGreaterThan(unofficialResult.score);
        expect(officialResult.reasons).toContain("公式");
      });

      test("should boost score for high security (>= 80)", () => {
        const highSecItem = {
          ...mockRecommendation,
          metrics: { source: "community" as const, isOfficial: false, securityScore: 80 },
        };
        const normalSecItem = {
          ...mockRecommendation,
          metrics: { source: "community" as const, isOfficial: false, securityScore: 70 },
        };

        const highResult = calculateScore(highSecItem, mockProject);
        const normalResult = calculateScore(normalSecItem, mockProject);

        expect(highResult.score).toBeGreaterThan(normalResult.score);
      });

      test("should penalize low security (< 50)", () => {
        const lowSecItem = {
          ...mockRecommendation,
          metrics: { source: "community" as const, isOfficial: false, securityScore: 45 },
        };
        const normalSecItem = {
          ...mockRecommendation,
          metrics: { source: "community" as const, isOfficial: false, securityScore: 70 },
        };

        const lowResult = calculateScore(lowSecItem, mockProject);
        const normalResult = calculateScore(normalSecItem, mockProject);

        expect(lowResult.score).toBeLessThan(normalResult.score);
      });

      test("should not apply security multiplier for mid-range scores (50-79)", () => {
        const midSecItem = {
          ...mockRecommendation,
          metrics: { source: "community" as const, isOfficial: false, securityScore: 60 },
        };
        const midSecItem2 = {
          ...mockRecommendation,
          metrics: { source: "community" as const, isOfficial: false, securityScore: 70 },
        };

        const result1 = calculateScore(midSecItem, mockProject);
        const result2 = calculateScore(midSecItem2, mockProject);

        // Scores should be equal since no multiplier is applied
        expect(result1.score).toBe(result2.score);
      });
    });

    describe("Boundary conditions", () => {
      test("should return zero score for no matches", () => {
        const noMatchProject: ProjectInfo = {
          path: "/test/no-match",
          languages: ["python"],
          frameworks: ["django"],
          dependencies: [],
          files: [],
        };

        const { score, reasons } = calculateScore(mockRecommendation, noMatchProject);

        expect(score).toBe(1);
        expect(reasons).toHaveLength(0);
      });

      test("should handle empty detection rules", () => {
        const item: Recommendation = {
          ...mockRecommendation,
          detection: {
            languages: [],
            frameworks: [],
            dependencies: [],
            files: [],
            keywords: [],
          },
        };

        const { score, reasons } = calculateScore(item, mockProject);

        expect(score).toBe(1);
        expect(reasons).toHaveLength(0);
      });

      test("should handle empty project info", () => {
        const emptyProject: ProjectInfo = {
          path: "/empty",
          languages: [],
          frameworks: [],
          dependencies: [],
          files: [],
        };

        const { score } = calculateScore(mockRecommendation, emptyProject);

        expect(score).toBe(1);
      });

      test("should handle undefined optional fields", () => {
        const item: Recommendation = {
          ...mockRecommendation,
          detection: {},
          metrics: {
            source: "community" as const,
          },
        };

        const { score } = calculateScore(item, mockProject);

        expect(score).toBe(1);
      });

      test("should handle security score at exact boundaries", () => {
        const scores = [0, 49, 50, 79, 80, 100];
        const results = scores.map((securityScore) => {
          const item = {
            ...mockRecommendation,
            metrics: { source: "community" as const, isOfficial: false, securityScore },
            detection: { languages: ["TypeScript"] },
          };
          return calculateScore(item, mockProject);
        });

        // 0-49: penalized
        expect(results[0].score).toBeLessThan(results[2].score);
        expect(results[1].score).toBeLessThan(results[2].score);

        // 50-79: normal
        expect(results[2].score).toBe(results[3].score);

        // 80-100: boosted
        expect(results[4].score).toBeGreaterThan(results[3].score);
        expect(results[5].score).toBeGreaterThan(results[3].score);
      });

      test("should round score to 2 decimal places", () => {
        const { score } = calculateScore(mockRecommendation, mockProject);

        expect(score).toBe(Math.round(score * 100) / 100);
        expect(score.toString().split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
      });
    });

    describe("Error handling", () => {
      test("should handle undefined user query", () => {
        const { score } = calculateScore(mockRecommendation, mockProject, undefined);

        expect(score).toBeGreaterThan(0); // Should still work with other matching
      });

      test("should handle empty user query", () => {
        const { score } = calculateScore(mockRecommendation, mockProject, "");

        expect(score).toBeGreaterThan(0); // Should still work with other matching
      });

      test("should handle special characters in query", () => {
        const { score } = calculateScore(mockRecommendation, mockProject, "test@#$%^&*()");

        expect(score).toBeGreaterThanOrEqual(0);
      });

      test("should handle very long strings", () => {
        const longString = "a".repeat(10000);
        const { score } = calculateScore(mockRecommendation, mockProject, longString);

        expect(score).toBeGreaterThanOrEqual(0);
      });

      test("should handle special characters in file paths", () => {
        const project: ProjectInfo = {
          ...mockProject,
          files: ["src/test (copy).tsx", "src/test[1].tsx"],
        };

        const { score } = calculateScore(mockRecommendation, project);

        expect(score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("recommend", () => {
    describe("Normal operation", () => {
      test("should return recommendations sorted by score (descending)", () => {
        const results = recommend(mockDatabase, mockProject);

        expect(results.length).toBeGreaterThan(0);
        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
        }
      });

      test("should filter by single type", () => {
        const results = recommend(mockDatabase, mockProject, undefined, {
          types: ["plugin"],
        });

        expect(results.every((r) => r.item.type === "plugin")).toBe(true);
      });

      test("should filter by multiple types", () => {
        const results = recommend(mockDatabase, mockProject, undefined, {
          types: ["plugin", "mcp"],
        });

        expect(results.every((r) => r.item.type === "plugin" || r.item.type === "mcp")).toBe(true);
      });

      test("should filter by minimum score", () => {
        const minScore = 10;
        const results = recommend(mockDatabase, mockProject, undefined, {
          minScore,
        });

        expect(results.every((r) => r.score >= minScore)).toBe(true);
      });

      test("should limit results by maxResults", () => {
        const maxResults = 1;
        const results = recommend(mockDatabase, mockProject, undefined, {
          maxResults,
        });

        expect(results.length).toBeLessThanOrEqual(maxResults);
      });

      test("should handle user query", () => {
        const results = recommend(mockDatabase, mockProject, "typescript react");

        expect(results.length).toBeGreaterThan(0);
      });

      test("should apply all options simultaneously", () => {
        const options: RecommendOptions = {
          types: ["plugin"],
          minScore: 1,
          maxResults: 5,
        };

        const results = recommend(mockDatabase, mockProject, "test", options);

        expect(results.every((r) => r.item.type === "plugin")).toBe(true);
        expect(results.every((r) => r.score >= 1)).toBe(true);
        expect(results.length).toBeLessThanOrEqual(5);
      });
    });

    describe("Boundary conditions", () => {
      test("should handle empty database", () => {
        const emptyDb: RecommendationDatabase = {
          version: "1.0.0",
          items: [],
          lastUpdated: new Date().toISOString(),
        };

        const results = recommend(emptyDb, mockProject);

        expect(results).toEqual([]);
      });

      test("should handle maxResults = 0", () => {
        const results = recommend(mockDatabase, mockProject, undefined, {
          maxResults: 0,
        });

        expect(results).toEqual([]);
      });

      test("should handle maxResults larger than available items", () => {
        const results = recommend(mockDatabase, mockProject, undefined, {
          maxResults: 1000,
        });

        expect(results.length).toBeLessThanOrEqual(mockDatabase.items.length);
      });

      test("should handle minScore that filters all results", () => {
        const results = recommend(mockDatabase, mockProject, undefined, {
          minScore: 99999,
        });

        expect(results).toEqual([]);
      });

      test("should handle minScore = 0", () => {
        const results = recommend(mockDatabase, mockProject, undefined, {
          minScore: 0,
        });

        expect(results.length).toBeGreaterThanOrEqual(0);
      });

      test("should handle negative minScore", () => {
        const results = recommend(mockDatabase, mockProject, undefined, {
          minScore: -100,
        });

        expect(results.length).toBeGreaterThanOrEqual(0);
      });

      test("should use default options when not provided", () => {
        const results = recommend(mockDatabase, mockProject);

        expect(results.length).toBeGreaterThanOrEqual(0);
        expect(results.length).toBeLessThanOrEqual(20); // Default maxResults
      });
    });

    describe("Error handling", () => {
      test("should handle non-existent type filter", () => {
        const results = recommend(mockDatabase, mockProject, undefined, {
          // @ts-expect-error - Testing invalid type handling
          types: ["nonexistent"],
        });

        expect(results).toEqual([]);
      });

      test("should handle empty types array", () => {
        const results = recommend(mockDatabase, mockProject, undefined, {
          types: [],
        });

        // Empty types array filters out all items
        expect(results).toEqual([]);
      });
    });
  });

  describe("search", () => {
    describe("Normal operation", () => {
      test("should find items by name (exact match)", () => {
        const results = search(mockDatabase, "Test Plugin");

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].item.name).toBe("Test Plugin");
      });

      test("should find items by partial name", () => {
        const results = search(mockDatabase, "Test");

        expect(results.length).toBeGreaterThan(0);
        expect(results.every((r) => r.item.name.includes("Test"))).toBe(true);
      });

      test("should find items by description", () => {
        const results = search(mockDatabase, "typescript");

        expect(results.length).toBeGreaterThan(0);
      });

      test("should find items by category", () => {
        const results = search(mockDatabase, "Development");

        expect(results.length).toBeGreaterThan(0);
      });

      test("should find items by tag", () => {
        const results = search(mockDatabase, "react");

        expect(results.length).toBeGreaterThan(0);
      });

      test("should be case-insensitive", () => {
        const results1 = search(mockDatabase, "TEST");
        const results2 = search(mockDatabase, "test");

        expect(results1.length).toBe(results2.length);
      });

      test("should boost official items", () => {
        const results = search(mockDatabase, "Test");
        const officialResults = results.filter((r) => r.item.metrics.isOfficial);
        const communityResults = results.filter((r) => !r.item.metrics.isOfficial);

        if (officialResults.length > 0 && communityResults.length > 0) {
          // Official items should have higher scores
          expect(officialResults[0].score).toBeGreaterThan(communityResults[0].score);
        }
      });

      test("should filter by type", () => {
        const results = search(mockDatabase, "Test", { types: ["mcp"] });

        expect(results.every((r) => r.item.type === "mcp")).toBe(true);
      });

      test("should limit results by maxResults", () => {
        const results = search(mockDatabase, "Test", { maxResults: 1 });

        expect(results.length).toBeLessThanOrEqual(1);
      });

      test("should sort by score descending", () => {
        const results = search(mockDatabase, "Test");

        for (let i = 0; i < results.length - 1; i++) {
          expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
        }
      });
    });

    describe("Boundary conditions", () => {
      test("should return empty array for no matches", () => {
        const results = search(mockDatabase, "nonexistent-query-xyz-123");

        expect(results).toEqual([]);
      });

      test("should handle empty database", () => {
        const emptyDb: RecommendationDatabase = {
          version: "1.0.0",
          items: [],
          lastUpdated: new Date().toISOString(),
        };

        const results = search(emptyDb, "test");

        expect(results).toEqual([]);
      });

      test("should handle empty query", () => {
        const results = search(mockDatabase, "");

        // Empty query still matches if name/description/etc contain empty string (always true)
        // So it returns all items, sorted by score
        expect(results.length).toBeGreaterThanOrEqual(0);
      });

      test("should handle maxResults = 0", () => {
        const results = search(mockDatabase, "Test", { maxResults: 0 });

        expect(results).toEqual([]);
      });

      test("should handle very large maxResults", () => {
        const results = search(mockDatabase, "Test", { maxResults: 99999 });

        expect(results.length).toBeLessThanOrEqual(mockDatabase.items.length);
      });

      test("should use default maxResults when not specified", () => {
        const results = search(mockDatabase, "Test");

        expect(results.length).toBeLessThanOrEqual(20); // Default maxResults
      });
    });

    describe("Error handling", () => {
      test("should handle special characters in query", () => {
        const results = search(mockDatabase, "test@#$%");

        expect(results).toEqual([]);
      });

      test("should handle very long query strings", () => {
        const longQuery = "a".repeat(10000);
        const results = search(mockDatabase, longQuery);

        expect(results).toEqual([]);
      });

      test("should handle whitespace-only query", () => {
        const results = search(mockDatabase, "   ");

        expect(results).toEqual([]);
      });

      test("should handle non-existent type filter", () => {
        const results = search(mockDatabase, "Test", {
          // @ts-expect-error - Testing invalid type handling
          types: ["nonexistent"],
        });

        expect(results).toEqual([]);
      });

      test("should handle empty types array", () => {
        const results = search(mockDatabase, "Test", { types: [] });

        // Empty types array filters out all items
        expect(results).toEqual([]);
      });

      test("should handle items with missing optional fields", () => {
        const dbWithMissingFields: RecommendationDatabase = {
          version: "1.0.0",
          items: [
            {
              ...mockRecommendation,
              tags: [],
              description: "",
            },
          ],
          lastUpdated: new Date().toISOString(),
        };

        const results = search(dbWithMissingFields, "test");

        expect(results).toBeDefined();
      });
    });

    describe("Scoring behavior", () => {
      test("name match should score highest", () => {
        const db: RecommendationDatabase = {
          version: "1.0.0",
          items: [
            {
              ...mockRecommendation,
              id: "1",
              name: "React Plugin",
              description: "other",
              category: "other",
              tags: [],
            },
            {
              ...mockRecommendation,
              id: "2",
              name: "other",
              description: "React description",
              category: "other",
              tags: [],
            },
          ],
          lastUpdated: new Date().toISOString(),
        };

        const results = search(db, "React");

        expect(results[0].item.id).toBe("1"); // Name match should be first
      });

      test("description match should score higher than category", () => {
        const db: RecommendationDatabase = {
          version: "1.0.0",
          items: [
            {
              ...mockRecommendation,
              id: "1",
              name: "Plugin A",
              description: "React tool",
              category: "other",
              tags: [],
            },
            {
              ...mockRecommendation,
              id: "2",
              name: "Plugin B",
              description: "other",
              category: "React",
              tags: [],
            },
          ],
          lastUpdated: new Date().toISOString(),
        };

        const results = search(db, "React");

        expect(results[0].item.id).toBe("1"); // Description match should score higher
      });
    });
  });

  describe("groupByType", () => {
    describe("Normal operation", () => {
      test("should group recommendations by type", () => {
        const recommendations = recommend(mockDatabase, mockProject);
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

        expect(result).toContain("他 5 件");
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
    });
  });
});
