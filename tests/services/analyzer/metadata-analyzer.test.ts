/**
 * Metadata Analyzer Tests
 */

import { describe, expect, it } from "vitest";
import { analyzeMetadata } from "../../../src/services/analyzer/metadata-analyzer.service.js";
import type { ProjectInfo } from "../../../src/types/service-types.js";

describe("Metadata Analyzer", () => {
  describe("Project Size Classification", () => {
    it("should classify as small project", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: Array(50).fill("file.ts"),
        dependencies: Array(5).fill("dep"),
        languages: ["typescript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.size).toBe("small");
      expect(metadata.fileCount).toBe(50);
    });

    it("should classify as medium project", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: Array(300).fill("file.ts"),
        dependencies: Array(20).fill("dep"),
        languages: ["typescript", "javascript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.size).toBe("medium");
    });

    it("should classify as large project", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: Array(1500).fill("file.ts"),
        dependencies: Array(70).fill("dep"),
        languages: ["typescript", "javascript", "python"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.size).toBe("large");
    });

    it("should classify as enterprise project", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: Array(3000).fill("file.ts"),
        dependencies: Array(150).fill("dep"),
        languages: ["typescript", "javascript", "python", "rust"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.size).toBe("enterprise");
    });
  });

  describe("Project Kind Detection", () => {
    it("should detect monorepo with pnpm-workspace.yaml", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: ["pnpm-workspace.yaml", "packages/app/index.ts"],
        dependencies: [],
        languages: ["typescript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.kind).toBe("monorepo");
      expect(metadata.workspaceCount).toBeGreaterThan(0);
    });

    it("should detect monorepo with lerna.json", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: ["lerna.json", "packages/core/index.ts"],
        dependencies: [],
        languages: ["typescript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.kind).toBe("monorepo");
    });

    it("should detect monorepo with nx.json", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: ["nx.json", "apps/frontend/src/main.ts"],
        dependencies: [],
        languages: ["typescript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.kind).toBe("monorepo");
    });

    it("should detect library project", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: ["tsup.config.ts", "src/index.ts", "dist/index.js"],
        dependencies: [],
        languages: ["typescript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.kind).toBe("library");
    });

    it("should detect application project", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: ["src/app/page.tsx", "src/components/Button.tsx"],
        dependencies: [],
        languages: ["typescript"],
        frameworks: ["react", "next"],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.kind).toBe("application");
    });

    it("should return unknown for unidentifiable projects", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: ["README.md"],
        dependencies: [],
        languages: [],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.kind).toBe("unknown");
    });
  });

  describe("Team Size Estimation", () => {
    it("should estimate solo developer for tiny projects", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: Array(20).fill("file.ts"),
        dependencies: Array(3).fill("dep"),
        languages: ["typescript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.estimatedTeamSize).toBe(1);
    });

    it("should estimate small team for small projects", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: Array(200).fill("file.ts"),
        dependencies: Array(20).fill("dep"),
        languages: ["typescript", "javascript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.estimatedTeamSize).toBe(3);
    });

    it("should estimate medium team for medium projects", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: Array(800).fill("file.ts"),
        dependencies: Array(50).fill("dep"),
        languages: ["typescript", "javascript", "python"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.estimatedTeamSize).toBe(10);
    });

    it("should estimate large team for large projects", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: Array(2500).fill("file.ts"),
        dependencies: Array(120).fill("dep"),
        languages: ["typescript", "javascript", "python", "rust"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.estimatedTeamSize).toBe(25);
    });
  });

  describe("Workspace Count Detection", () => {
    it("should count packages in monorepo", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: [
          "pnpm-workspace.yaml",
          "packages/app/index.ts",
          "packages/core/index.ts",
          "packages/utils/index.ts",
        ],
        dependencies: [],
        languages: ["typescript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.kind).toBe("monorepo");
      expect(metadata.workspaceCount).toBe(3);
    });

    it("should count apps in monorepo", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: ["nx.json", "apps/frontend/src/main.ts", "apps/backend/src/server.ts"],
        dependencies: [],
        languages: ["typescript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.kind).toBe("monorepo");
      expect(metadata.workspaceCount).toBe(2);
    });

    it("should not count workspaces for non-monorepo projects", () => {
      const project: ProjectInfo = {
        path: "/test",
        files: ["src/index.ts"],
        dependencies: [],
        languages: ["typescript"],
        frameworks: [],
      };

      const metadata = analyzeMetadata(project);
      expect(metadata.kind).not.toBe("monorepo");
      expect(metadata.workspaceCount).toBeUndefined();
    });
  });
});
