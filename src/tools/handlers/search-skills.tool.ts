/**
 * Search Skills Tool
 *
 * Searches for skills, plugins, and MCP servers by keyword
 */

import type { SearchSkillsInput } from "../../schemas/tool-schemas.js";
import { search } from "../../services/recommender/search.service.js";
import type { Recommendation, RecommendationDatabase } from "../../types/domain-types.js";

export type SearchSkillsResult = {
  query: string;
  results: Array<{
    name: string;
    type: Recommendation["type"];
    description: string;
    score: number;
    reasons: string[];
    url: string;
    install: Recommendation["install"];
    isOfficial?: boolean;
    category: string;
  }>;
  totalFound: number;
};

/**
 * Search for skills by keyword
 */
export async function searchSkills(
  input: SearchSkillsInput,
  database: RecommendationDatabase,
): Promise<SearchSkillsResult> {
  const results = search(database, input.query, {
    maxResults: input.max_results,
    types: input.types,
  });

  return {
    query: input.query,
    results: results.map((r) => ({
      name: r.item.name,
      type: r.item.type,
      description: r.item.description,
      score: r.score,
      reasons: r.reasons,
      url: r.item.url,
      install: r.item.install,
      isOfficial: r.item.metrics.isOfficial,
      category: r.item.category,
    })),
    totalFound: results.length,
  };
}
