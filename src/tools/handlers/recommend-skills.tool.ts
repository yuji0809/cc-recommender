/**
 * Recommend Skills Tool
 *
 * Analyzes a project and recommends suitable skills, plugins, and MCP servers
 */

import type { RecommendSkillsInput } from "../../schemas/tool-schemas.js";
import { analyzeProject } from "../../services/analyzer/project-analyzer.service.js";
import { formatRecommendations } from "../../services/recommender/formatters.js";
import { recommend } from "../../services/recommender/recommendation.service.js";
import type { Recommendation, RecommendationDatabase } from "../../types/domain-types.js";

export type RecommendSkillsResult = {
  project: {
    path: string;
    languages: string[];
    frameworks: string[];
    dependencyCount: number;
  };
  recommendations: Array<{
    name: string;
    type: Recommendation["type"];
    description: string;
    score: number;
    reasons: string[];
    url: string;
    install: Recommendation["install"];
    isOfficial?: boolean;
  }>;
  formatted: string;
  totalFound: number;
};

/**
 * Recommend skills based on project analysis
 */
export async function recommendSkills(
  input: RecommendSkillsInput,
  database: RecommendationDatabase,
): Promise<RecommendSkillsResult> {
  // Analyze the project
  const projectInfo = await analyzeProject(input.project_path);

  // Get recommendations
  const recommendations = recommend(database, projectInfo, input.description, {
    maxResults: input.max_results,
    types: input.types,
  });

  // Format for display
  const formatted = formatRecommendations(recommendations);

  return {
    project: {
      path: projectInfo.path,
      languages: projectInfo.languages,
      frameworks: projectInfo.frameworks,
      dependencyCount: projectInfo.dependencies.length,
    },
    recommendations: recommendations.map((r) => ({
      name: r.item.name,
      type: r.item.type,
      description: r.item.description,
      score: r.score,
      reasons: r.reasons,
      url: r.item.url,
      install: r.item.install,
      isOfficial: r.item.metrics.isOfficial,
    })),
    formatted,
    totalFound: recommendations.length,
  };
}
