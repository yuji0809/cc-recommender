/**
 * Get Skill Details Tool
 *
 * Gets detailed information about a specific skill/plugin/MCP
 */

import type { GetSkillDetailsInput } from "../../schemas/tool-schemas.js";
import type { Recommendation, RecommendationDatabase } from "../../types/domain-types.js";

export type GetSkillDetailsResult = {
  id: string;
  name: string;
  type: Recommendation["type"];
  description: string;
  url: string;
  author: Recommendation["author"];
  category: string;
  tags: string[];
  install: Recommendation["install"];
  metrics: Recommendation["metrics"];
  detection: Recommendation["detection"];
};

/**
 * Get detailed information about a specific item
 */
export async function getSkillDetails(
  input: GetSkillDetailsInput,
  database: RecommendationDatabase,
): Promise<GetSkillDetailsResult | null> {
  const item = database.items.find(
    (i) =>
      i.name.toLowerCase() === input.name.toLowerCase() ||
      i.id.toLowerCase() === input.name.toLowerCase(),
  );

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    description: item.description,
    url: item.url,
    author: item.author,
    category: item.category,
    tags: item.tags,
    install: item.install,
    metrics: item.metrics,
    detection: item.detection,
  };
}
