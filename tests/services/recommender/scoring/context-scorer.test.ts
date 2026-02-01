/**
 * Context Scorer Tests
 */

import { describe, expect, it } from "vitest";
import { calculateContextScore } from "../../../../src/services/recommender/scoring/context-scorer.js";
import type { Recommendation } from "../../../../src/types/domain-types.js";
import type { ProjectMetadata } from "../../../../src/types/scoring-types.js";

describe("Context Scorer", () => {
  describe("Monorepo Bonus", () => {
    it("should give bonus to monorepo tools for monorepo projects", () => {
      const metadata: ProjectMetadata = {
        size: "medium",
        kind: "monorepo",
        estimatedTeamSize: 5,
        workspaceCount: 3,
        fileCount: 300,
        languageCount: 2,
      };

      const item: Recommendation = {
        id: "nx",
        name: "Nx",
        type: "skill",
        url: "https://github.com/nrwl/nx",
        description: "Monorepo build system",
        author: { name: "nrwl" },
        category: "Build System",
        tags: ["monorepo", "nx", "build-system"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const { score, reasons } = calculateContextScore(item, metadata);

      expect(score).toBeGreaterThan(0);
      expect(reasons).toContain("モノレポ対応");
    });

    it("should not give bonus to non-monorepo tools for monorepo projects", () => {
      const metadata: ProjectMetadata = {
        size: "medium",
        kind: "monorepo",
        estimatedTeamSize: 5,
        workspaceCount: 3,
        fileCount: 300,
        languageCount: 2,
      };

      const item: Recommendation = {
        id: "eslint",
        name: "ESLint",
        type: "skill",
        url: "https://github.com/eslint/eslint",
        description: "JavaScript linter",
        author: { name: "eslint" },
        category: "Linting",
        tags: ["linting", "javascript"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const { score } = calculateContextScore(item, metadata);

      expect(score).toBe(0);
    });

    it("should not give bonus to monorepo tools for non-monorepo projects", () => {
      const metadata: ProjectMetadata = {
        size: "small",
        kind: "application",
        estimatedTeamSize: 1,
        fileCount: 50,
        languageCount: 1,
      };

      const item: Recommendation = {
        id: "turborepo",
        name: "Turborepo",
        type: "skill",
        url: "https://github.com/vercel/turbo",
        description: "Monorepo tool",
        author: { name: "vercel" },
        category: "Build System",
        tags: ["monorepo", "turborepo"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const { score } = calculateContextScore(item, metadata);

      expect(score).toBe(0);
    });
  });

  describe("Project Size Match", () => {
    it("should give bonus to enterprise tools for large projects", () => {
      const metadata: ProjectMetadata = {
        size: "enterprise",
        kind: "application",
        estimatedTeamSize: 25,
        fileCount: 3000,
        languageCount: 4,
      };

      const item: Recommendation = {
        id: "testing-framework",
        name: "Testing Framework",
        type: "skill",
        url: "https://github.com/test/test",
        description: "Comprehensive testing",
        author: { name: "test" },
        category: "Testing",
        tags: ["testing", "ci/cd"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const { score, reasons } = calculateContextScore(item, metadata);

      expect(score).toBeGreaterThan(0);
      expect(reasons).toContain("enterpriseプロジェクト向け");
    });

    it("should give bonus to simple tools for small projects", () => {
      const metadata: ProjectMetadata = {
        size: "small",
        kind: "library",
        estimatedTeamSize: 1,
        fileCount: 50,
        languageCount: 1,
      };

      const item: Recommendation = {
        id: "quick-tool",
        name: "Quick Tool",
        type: "skill",
        url: "https://github.com/quick/tool",
        description: "Simple and lightweight",
        author: { name: "quick" },
        category: "Utility",
        tags: ["simple", "lightweight"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const { score, reasons } = calculateContextScore(item, metadata);

      expect(score).toBeGreaterThan(0);
      expect(reasons).toContain("smallプロジェクト向け");
    });

    it("should not give size bonus for medium projects", () => {
      const metadata: ProjectMetadata = {
        size: "medium",
        kind: "application",
        estimatedTeamSize: 5,
        fileCount: 300,
        languageCount: 2,
      };

      const item: Recommendation = {
        id: "generic-tool",
        name: "Generic Tool",
        type: "skill",
        url: "https://github.com/generic/tool",
        description: "Generic tool",
        author: { name: "generic" },
        category: "Utility",
        tags: ["tool"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const { score } = calculateContextScore(item, metadata);

      expect(score).toBe(0);
    });
  });

  describe("Team Size Match", () => {
    it("should give bonus to collaboration tools for teams", () => {
      const metadata: ProjectMetadata = {
        size: "large",
        kind: "application",
        estimatedTeamSize: 10,
        fileCount: 1500,
        languageCount: 3,
      };

      const item: Recommendation = {
        id: "collab-tool",
        name: "Collaboration Tool",
        type: "skill",
        url: "https://github.com/collab/tool",
        description: "Team collaboration",
        author: { name: "collab" },
        category: "Collaboration",
        tags: ["collaboration", "team"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const { score, reasons } = calculateContextScore(item, metadata);

      expect(score).toBeGreaterThan(0);
      expect(reasons).toContain("チーム規模適合");
    });

    it("should not give team bonus for solo developers", () => {
      const metadata: ProjectMetadata = {
        size: "small",
        kind: "library",
        estimatedTeamSize: 1,
        fileCount: 50,
        languageCount: 1,
      };

      const item: Recommendation = {
        id: "review-tool",
        name: "Review Tool",
        type: "skill",
        url: "https://github.com/review/tool",
        description: "Code review tool",
        author: { name: "review" },
        category: "Review",
        tags: ["review", "team"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const { score } = calculateContextScore(item, metadata);

      expect(score).toBe(0);
    });
  });

  describe("Combined Scoring", () => {
    it("should combine multiple bonuses", () => {
      const metadata: ProjectMetadata = {
        size: "large",
        kind: "monorepo",
        estimatedTeamSize: 15,
        workspaceCount: 5,
        fileCount: 2000,
        languageCount: 3,
      };

      const item: Recommendation = {
        id: "nx-workspace",
        name: "Nx Workspace",
        type: "skill",
        url: "https://github.com/nrwl/nx",
        description: "Monorepo collaboration tool with testing",
        author: { name: "nrwl" },
        category: "Build System",
        tags: ["monorepo", "nx", "testing", "collaboration"],
        detection: {},
        metrics: { source: "community" },
        install: { method: "manual" },
      };

      const { score, reasons } = calculateContextScore(item, metadata);

      // Should get monorepo bonus + enterprise size bonus + team bonus
      expect(score).toBeGreaterThan(5);
      expect(reasons.length).toBeGreaterThan(1);
    });
  });
});
