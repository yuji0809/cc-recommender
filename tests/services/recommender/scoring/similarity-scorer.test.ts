/**
 * Similarity Scorer Tests (TDD Approach)
 */

import { describe, expect, it } from "vitest";
import {
  buildSimilarityMatrix,
  calculateSimilarityScore,
  extractProjectTags,
} from "../../../../src/services/recommender/scoring/similarity-scorer.js";
import type { Recommendation, RecommendationDatabase } from "../../../../src/types/domain-types.js";
import type { SimilarityMatrix } from "../../../../src/types/scoring-types.js";
import type { ProjectInfo } from "../../../../src/types/service-types.js";

// ============================================================================
// extractProjectTags Tests
// ============================================================================

describe("extractProjectTags", () => {
  describe("Normal Cases", () => {
    it("should extract languages as tags", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: [],
        languages: ["typescript", "javascript"],
        dependencies: [],
        frameworks: [],
      };

      const tags = extractProjectTags(project);

      expect(tags).toContain("typescript");
      expect(tags).toContain("javascript");
    });

    it("should extract frameworks as tags", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: [],
        languages: ["typescript"],
        dependencies: [],
        frameworks: ["react", "next"],
      };

      const tags = extractProjectTags(project);

      expect(tags).toContain("react");
      expect(tags).toContain("next");
    });

    it("should extract dependencies as tags (top 10)", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: [],
        languages: [],
        dependencies: Array.from({ length: 15 }, (_, i) => `dep${i}`),
        frameworks: [],
      };

      const tags = extractProjectTags(project);

      // Should include first 10 dependencies
      expect(tags).toContain("dep0");
      expect(tags).toContain("dep9");
      // Should not include 11th dependency
      expect(tags).not.toContain("dep10");
    });

    it("should combine all sources", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: [],
        languages: ["typescript"],
        dependencies: ["react", "vitest"],
        frameworks: ["next"],
      };

      const tags = extractProjectTags(project);

      expect(tags).toHaveLength(4);
      expect(tags).toEqual(expect.arrayContaining(["typescript", "next", "react", "vitest"]));
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty project", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: [],
        languages: [],
        dependencies: [],
        frameworks: [],
      };

      const tags = extractProjectTags(project);

      expect(tags).toEqual([]);
    });

    it("should handle project with only languages", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: [],
        languages: ["typescript"],
        dependencies: [],
        frameworks: [],
      };

      const tags = extractProjectTags(project);

      expect(tags).toEqual(["typescript"]);
    });
  });
});

// ============================================================================
// buildSimilarityMatrix Tests
// ============================================================================

describe("buildSimilarityMatrix", () => {
  describe("Normal Cases", () => {
    it("should count tag co-occurrences", () => {
      const database: RecommendationDatabase = {
        version: "1.0",
        lastUpdated: "2024-01-01",
        items: [
          {
            id: "1",
            name: "Item 1",
            type: "skill",
            url: "https://example.com/1",
            description: "Test",
            author: { name: "test" },
            category: "Test",
            tags: ["react", "testing"],
            detection: {},
            metrics: { source: "community" },
            install: { method: "manual" },
          },
          {
            id: "2",
            name: "Item 2",
            type: "skill",
            url: "https://example.com/2",
            description: "Test",
            author: { name: "test" },
            category: "Test",
            tags: ["react", "nextjs"],
            detection: {},
            metrics: { source: "community" },
            install: { method: "manual" },
          },
        ],
      };

      const matrix = buildSimilarityMatrix(database);

      expect(matrix.cooccurrence.get("react")?.get("testing")).toBe(1);
      expect(matrix.cooccurrence.get("react")?.get("nextjs")).toBe(1);
      expect(matrix.tagCounts.get("react")).toBe(2);
    });

    it("should be bidirectional", () => {
      const database: RecommendationDatabase = {
        version: "1.0",
        lastUpdated: "2024-01-01",
        items: [
          {
            id: "1",
            name: "Item 1",
            type: "skill",
            url: "https://example.com/1",
            description: "Test",
            author: { name: "test" },
            category: "Test",
            tags: ["a", "b"],
            detection: {},
            metrics: { source: "community" },
            install: { method: "manual" },
          },
        ],
      };

      const matrix = buildSimilarityMatrix(database);

      // a -> b and b -> a should both exist
      expect(matrix.cooccurrence.get("a")?.get("b")).toBe(1);
      expect(matrix.cooccurrence.get("b")?.get("a")).toBe(1);
    });

    it("should handle multiple occurrences", () => {
      const database: RecommendationDatabase = {
        version: "1.0",
        lastUpdated: "2024-01-01",
        items: [
          {
            id: "1",
            name: "Item 1",
            type: "skill",
            url: "https://example.com/1",
            description: "Test",
            author: { name: "test" },
            category: "Test",
            tags: ["react", "testing"],
            detection: {},
            metrics: { source: "community" },
            install: { method: "manual" },
          },
          {
            id: "2",
            name: "Item 2",
            type: "skill",
            url: "https://example.com/2",
            description: "Test",
            author: { name: "test" },
            category: "Test",
            tags: ["react", "testing"],
            detection: {},
            metrics: { source: "community" },
            install: { method: "manual" },
          },
        ],
      };

      const matrix = buildSimilarityMatrix(database);

      // Should count both occurrences
      expect(matrix.cooccurrence.get("react")?.get("testing")).toBe(2);
      expect(matrix.tagCounts.get("react")).toBe(2);
      expect(matrix.tagCounts.get("testing")).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty database", () => {
      const database: RecommendationDatabase = {
        version: "1.0",
        lastUpdated: "2024-01-01",
        items: [],
      };

      const matrix = buildSimilarityMatrix(database);

      expect(matrix.cooccurrence.size).toBe(0);
      expect(matrix.tagCounts.size).toBe(0);
    });

    it("should handle items with no tags", () => {
      const database: RecommendationDatabase = {
        version: "1.0",
        lastUpdated: "2024-01-01",
        items: [
          {
            id: "1",
            name: "Item 1",
            type: "skill",
            url: "https://example.com/1",
            description: "Test",
            author: { name: "test" },
            category: "Test",
            tags: [],
            detection: {},
            metrics: { source: "community" },
            install: { method: "manual" },
          },
        ],
      };

      const matrix = buildSimilarityMatrix(database);

      expect(matrix.cooccurrence.size).toBe(0);
      expect(matrix.tagCounts.size).toBe(0);
    });

    it("should normalize tags to lowercase", () => {
      const database: RecommendationDatabase = {
        version: "1.0",
        lastUpdated: "2024-01-01",
        items: [
          {
            id: "1",
            name: "Item 1",
            type: "skill",
            url: "https://example.com/1",
            description: "Test",
            author: { name: "test" },
            category: "Test",
            tags: ["React", "Testing"],
            detection: {},
            metrics: { source: "community" },
            install: { method: "manual" },
          },
        ],
      };

      const matrix = buildSimilarityMatrix(database);

      expect(matrix.tagCounts.has("react")).toBe(true);
      expect(matrix.tagCounts.has("testing")).toBe(true);
      expect(matrix.tagCounts.has("React")).toBe(false);
    });
  });
});

// ============================================================================
// calculateSimilarityScore Tests
// ============================================================================

describe("calculateSimilarityScore", () => {
  // Helper to create a simple matrix
  const createSimpleMatrix = (): SimilarityMatrix => {
    const cooccurrence = new Map<string, Map<string, number>>();
    const tagCounts = new Map<string, number>();

    // react: 5 occurrences, testing: 4, nextjs: 2
    tagCounts.set("react", 5);
    tagCounts.set("testing", 4);
    tagCounts.set("nextjs", 2);

    // react + testing: 3 times (above minCooccurrence threshold)
    cooccurrence.set("react", new Map([["testing", 3]]));
    cooccurrence.set("testing", new Map([["react", 3]]));

    return { cooccurrence, tagCounts };
  };

  describe("Normal Cases", () => {
    it("should calculate similarity for matching tags", () => {
      const item: Recommendation = {
        id: "1",
        name: "Testing Tool",
        type: "skill",
        url: "https://example.com/1",
        description: "Test",
        author: { name: "test" },
        category: "Test",
        tags: ["testing", "vitest"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const projectTags = ["react", "typescript"];
      const matrix = createSimpleMatrix();

      const { score, reasons } = calculateSimilarityScore(item, projectTags, matrix);

      // Should find similarity between "react" and "testing"
      expect(score).toBeGreaterThan(0);
      expect(reasons.length).toBeGreaterThan(0);
    });

    it("should include similarity reasons", () => {
      const item: Recommendation = {
        id: "1",
        name: "Testing Tool",
        type: "skill",
        url: "https://example.com/1",
        description: "Test",
        author: { name: "test" },
        category: "Test",
        tags: ["testing"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const projectTags = ["react"];
      const matrix = createSimpleMatrix();

      const { score, reasons } = calculateSimilarityScore(item, projectTags, matrix);

      expect(score).toBeGreaterThan(0);
      expect(reasons.length).toBeGreaterThan(0);
      expect(reasons[0]).toContain("react");
      expect(reasons[0]).toContain("testing");
    });
  });

  describe("Edge Cases", () => {
    it("should return 0 for no similarity", () => {
      const item: Recommendation = {
        id: "1",
        name: "Unrelated Tool",
        type: "skill",
        url: "https://example.com/1",
        description: "Test",
        author: { name: "test" },
        category: "Test",
        tags: ["golang", "docker"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const projectTags = ["react", "typescript"];
      const matrix = createSimpleMatrix();

      const { score, reasons } = calculateSimilarityScore(item, projectTags, matrix);

      expect(score).toBe(0);
      expect(reasons).toEqual([]);
    });

    it("should handle empty project tags", () => {
      const item: Recommendation = {
        id: "1",
        name: "Tool",
        type: "skill",
        url: "https://example.com/1",
        description: "Test",
        author: { name: "test" },
        category: "Test",
        tags: ["testing"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const projectTags: string[] = [];
      const matrix = createSimpleMatrix();

      const { score } = calculateSimilarityScore(item, projectTags, matrix);

      expect(score).toBe(0);
    });

    it("should cap score at maxSimilarityBonus", () => {
      // Create a matrix with very high similarity
      const matrix: SimilarityMatrix = {
        cooccurrence: new Map([
          ["a", new Map([["b", 1000]])],
          ["b", new Map([["a", 1000]])],
        ]),
        tagCounts: new Map([
          ["a", 1000],
          ["b", 1000],
        ]),
      };

      const item: Recommendation = {
        id: "1",
        name: "Tool",
        type: "skill",
        url: "https://example.com/1",
        description: "Test",
        author: { name: "test" },
        category: "Test",
        tags: ["b", "b", "b", "b", "b"], // Repeated tags
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const projectTags = ["a", "a", "a", "a", "a"];

      const { score } = calculateSimilarityScore(item, projectTags, matrix);

      // Should be capped at maxSimilarityBonus (5.0)
      expect(score).toBeLessThanOrEqual(5.0);
    });
  });
});
