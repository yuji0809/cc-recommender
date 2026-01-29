/**
 * MCP Tools
 * 
 * Tool definitions for the cc-recommender MCP server
 */

import { z } from "zod";
import type { 
  Recommendation, 
  RecommendationDatabase, 
  ScoredRecommendation 
} from "../types/index.js";
import { analyzeProject } from "../services/analyzer.js";
import { 
  recommend, 
  search, 
  formatRecommendations 
} from "../services/recommender.js";

/**
 * Tool: recommend_skills
 * 
 * Analyzes a project and recommends suitable skills, plugins, and MCP servers
 */
export const recommendSkillsSchema = z.object({
  project_path: z.string().describe("プロジェクトのパス"),
  description: z.string().optional().describe("何を作りたいか、何を探しているか"),
  types: z.array(z.enum([
    "plugin", "mcp", "skill", "workflow", "hook", "command", "agent"
  ])).optional().describe("フィルタするタイプ"),
  max_results: z.number().min(1).max(50).optional().default(20).describe("最大結果数"),
});

export type RecommendSkillsInput = z.infer<typeof recommendSkillsSchema>;

export async function recommendSkills(
  input: RecommendSkillsInput,
  database: RecommendationDatabase
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
    recommendations: recommendations.map(r => ({
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

export interface RecommendSkillsResult {
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
}

/**
 * Tool: search_skills
 * 
 * Search for skills, plugins, and MCP servers by keyword
 */
export const searchSkillsSchema = z.object({
  query: z.string().describe("検索キーワード"),
  types: z.array(z.enum([
    "plugin", "mcp", "skill", "workflow", "hook", "command", "agent"
  ])).optional().describe("フィルタするタイプ"),
  max_results: z.number().min(1).max(50).optional().default(20).describe("最大結果数"),
});

export type SearchSkillsInput = z.infer<typeof searchSkillsSchema>;

export async function searchSkills(
  input: SearchSkillsInput,
  database: RecommendationDatabase
): Promise<SearchSkillsResult> {
  const results = search(database, input.query, {
    maxResults: input.max_results,
    types: input.types,
  });
  
  return {
    query: input.query,
    results: results.map(r => ({
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

export interface SearchSkillsResult {
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
}

/**
 * Tool: get_skill_details
 * 
 * Get detailed information about a specific skill/plugin/MCP
 */
export const getSkillDetailsSchema = z.object({
  name: z.string().describe("スキル/プラグイン/MCPの名前"),
});

export type GetSkillDetailsInput = z.infer<typeof getSkillDetailsSchema>;

export async function getSkillDetails(
  input: GetSkillDetailsInput,
  database: RecommendationDatabase
): Promise<GetSkillDetailsResult | null> {
  const item = database.items.find(
    i => i.name.toLowerCase() === input.name.toLowerCase() ||
         i.id.toLowerCase() === input.name.toLowerCase()
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

export interface GetSkillDetailsResult {
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
}

/**
 * Tool: list_categories
 * 
 * List all available categories
 */
export async function listCategories(
  database: RecommendationDatabase
): Promise<ListCategoriesResult> {
  const categoryMap = new Map<string, { count: number; types: Set<string> }>();
  
  for (const item of database.items) {
    const cat = item.category;
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { count: 0, types: new Set() });
    }
    const entry = categoryMap.get(cat)!;
    entry.count++;
    entry.types.add(item.type);
  }
  
  const categories = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      types: Array.from(data.types),
    }))
    .sort((a, b) => b.count - a.count);
  
  return {
    categories,
    totalItems: database.items.length,
  };
}

export interface ListCategoriesResult {
  categories: Array<{
    name: string;
    count: number;
    types: string[];
  }>;
  totalItems: number;
}

/**
 * Tool: get_stats
 * 
 * Get database statistics
 */
export async function getStats(
  database: RecommendationDatabase
): Promise<GetStatsResult> {
  const typeCount = new Map<string, number>();
  const sourceCount = new Map<string, number>();
  let officialCount = 0;
  
  for (const item of database.items) {
    // Count by type
    typeCount.set(item.type, (typeCount.get(item.type) || 0) + 1);
    
    // Count by source
    sourceCount.set(item.metrics.source, (sourceCount.get(item.metrics.source) || 0) + 1);
    
    // Count official
    if (item.metrics.isOfficial) {
      officialCount++;
    }
  }
  
  return {
    version: database.version,
    lastUpdated: database.lastUpdated,
    totalItems: database.items.length,
    byType: Object.fromEntries(typeCount),
    bySource: Object.fromEntries(sourceCount),
    officialCount,
  };
}

export interface GetStatsResult {
  version: string;
  lastUpdated: string;
  totalItems: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
  officialCount: number;
}
