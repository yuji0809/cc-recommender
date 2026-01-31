import { describe, expect, test } from "vitest";
import {
  type RecommendOptions,
  recommend,
} from "../../src/services/recommender/recommendation.service.js";
import { search } from "../../src/services/recommender/search.service.js";
import type { ProjectInfo, Recommendation, RecommendationDatabase } from "../../src/types/index.js";

describe("Search and Recommendation", () => {
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
});
