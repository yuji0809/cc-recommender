/**
 * Metadata Analyzer Service
 *
 * Analyzes project metadata (size, kind, team scale, etc.)
 */

import { PROJECT_SIZE_THRESHOLDS } from "../../config/enhanced-scoring-config.js";
import type { ProjectKind, ProjectMetadata, ProjectSize } from "../../types/scoring-types.js";
import type { ProjectInfo } from "../../types/service-types.js";

/**
 * Analyze project metadata from ProjectInfo
 *
 * @param project - The project information
 * @returns Project metadata (size, kind, team size, etc.)
 */
export function analyzeMetadata(project: ProjectInfo): ProjectMetadata {
  const fileCount = project.files.length;
  const depCount = project.dependencies.length;
  const languageCount = project.languages.length;

  // Classify project size
  const size = classifyProjectSize(fileCount, depCount);

  // Detect project kind
  const kind = detectProjectKind(project);

  // Estimate team size
  const estimatedTeamSize = estimateTeamSize(project);

  // Detect workspace count (for monorepo)
  const workspaceCount = kind === "monorepo" ? detectWorkspaceCount(project) : undefined;

  return {
    size,
    kind,
    estimatedTeamSize,
    workspaceCount,
    fileCount,
    languageCount,
  };
}

/**
 * Classify project size based on file count and dependency count
 *
 * @param fileCount - Number of files in the project
 * @param depCount - Number of dependencies
 * @returns Project size classification
 */
function classifyProjectSize(fileCount: number, depCount: number): ProjectSize {
  const { small, medium, large } = PROJECT_SIZE_THRESHOLDS;

  if (fileCount <= small.maxFiles && depCount <= small.maxDeps) {
    return "small";
  }
  if (fileCount <= medium.maxFiles && depCount <= medium.maxDeps) {
    return "medium";
  }
  if (fileCount <= large.maxFiles && depCount <= large.maxDeps) {
    return "large";
  }

  return "enterprise";
}

/**
 * Detect project kind (monorepo, library, application, unknown)
 *
 * @param project - The project information
 * @returns Project kind
 */
function detectProjectKind(project: ProjectInfo): ProjectKind {
  // Check for monorepo indicators
  const hasMonorepoIndicators = project.files.some(
    (f) =>
      f === "pnpm-workspace.yaml" ||
      f === "lerna.json" ||
      f === "nx.json" ||
      f.startsWith("packages/") ||
      f.startsWith("apps/"),
  );

  if (hasMonorepoIndicators) {
    return "monorepo";
  }

  // Check for library indicators
  const hasLibraryIndicators = project.files.some(
    (f) =>
      f === "tsup.config.ts" ||
      f === "rollup.config.js" ||
      f === "vite.config.lib.ts" ||
      f.includes("dist/index"),
  );

  if (hasLibraryIndicators) {
    return "library";
  }

  // Check for application indicators
  const hasAppIndicators =
    project.frameworks.length > 0 ||
    project.files.some(
      (f) => f.includes("src/app") || f.includes("src/pages") || f.includes("src/routes"),
    );

  if (hasAppIndicators) {
    return "application";
  }

  return "unknown";
}

/**
 * Estimate team size from project characteristics
 *
 * Heuristic formula: (fileCount / 50) + (depCount / 10) + (langCount * 2)
 *
 * @param project - The project information
 * @returns Estimated team size (1 = solo, 2-5 = small, 6-20 = medium, 21+ = large)
 */
function estimateTeamSize(project: ProjectInfo): number {
  const fileCount = project.files.length;
  const depCount = project.dependencies.length;
  const langCount = project.languages.length;

  // Calculate complexity score
  const score = fileCount / 50 + depCount / 10 + langCount * 2;

  // Map score to team size
  if (score < 5) return 1; // Solo developer
  if (score < 15) return 3; // Small team (2-5)
  if (score < 40) return 10; // Medium team (6-20)
  return 25; // Large team (21+)
}

/**
 * Detect workspace count for monorepo projects
 *
 * @param project - The project information
 * @returns Number of workspaces/packages in the monorepo
 */
function detectWorkspaceCount(project: ProjectInfo): number {
  // Detect packages/ or apps/ directories
  const workspaceDirs = project.files.filter(
    (f) => f.startsWith("packages/") || f.startsWith("apps/"),
  );

  // Extract unique workspace directories (first two path segments)
  const uniqueDirs = new Set(workspaceDirs.map((f) => f.split("/").slice(0, 2).join("/")));

  return uniqueDirs.size;
}
