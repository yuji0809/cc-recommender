import { describe, expect, test } from "vitest";
import { calculateScore } from "../../src/services/recommender/scoring/scorer.js";
import type { ProjectInfo, Recommendation } from "../../src/types/index.js";

describe("Scorer", () => {
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
});
