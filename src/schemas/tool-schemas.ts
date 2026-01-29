/**
 * Tool Schemas
 *
 * Zod validation schemas for MCP tool inputs
 */

import { z } from "zod";

/**
 * Schema for recommend_skills tool input
 */
export const recommendSkillsSchema = z.object({
  project_path: z.string().describe("プロジェクトのパス"),
  description: z.string().optional().describe("何を作りたいか、何を探しているか"),
  types: z
    .array(z.enum(["plugin", "mcp", "skill", "workflow", "hook", "command", "agent"]))
    .optional()
    .describe("フィルタするタイプ"),
  max_results: z.number().min(1).max(50).optional().default(20).describe("最大結果数"),
});

export type RecommendSkillsInput = z.infer<typeof recommendSkillsSchema>;

/**
 * Schema for search_skills tool input
 */
export const searchSkillsSchema = z.object({
  query: z.string().describe("検索キーワード"),
  types: z
    .array(z.enum(["plugin", "mcp", "skill", "workflow", "hook", "command", "agent"]))
    .optional()
    .describe("フィルタするタイプ"),
  max_results: z.number().min(1).max(50).optional().default(20).describe("最大結果数"),
});

export type SearchSkillsInput = z.infer<typeof searchSkillsSchema>;

/**
 * Schema for get_skill_details tool input
 */
export const getSkillDetailsSchema = z.object({
  name: z.string().describe("スキル/プラグイン/MCPの名前"),
});

export type GetSkillDetailsInput = z.infer<typeof getSkillDetailsSchema>;
