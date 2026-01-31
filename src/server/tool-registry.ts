/**
 * Tool Registry
 *
 * Registers all MCP tools with the server
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getSkillDetailsSchema,
  recommendSkillsSchema,
  searchSkillsSchema,
} from "../schemas/tool-schemas.js";
import {
  getSkillDetails,
  getStats,
  listCategories,
  recommendSkills,
  searchSkills,
} from "../tools/handlers/index.js";
import type { RecommendationDatabase } from "../types/index.js";

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: McpServer, database: RecommendationDatabase): void {
  /**
   * recommend_skills - Analyze project and recommend
   */
  server.registerTool(
    "recommend_skills",
    {
      title: "プロジェクト推薦",
      description:
        "プロジェクトを分析し、適切なツールを推薦します。デフォルトではプラグイン、MCPサーバー、スキル、ワークフロー、フック、コマンド、エージェントすべてのタイプを推薦します。ユーザーが特定のタイプ（例：「スキルだけ教えて」）を要求した場合のみ types パラメータで絞り込んでください。",
      inputSchema: recommendSkillsSchema.shape,
    },
    async (input) => {
      const result = await recommendSkills(input, database);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  /**
   * search_skills - Search by keyword
   */
  server.registerTool(
    "search_skills",
    {
      title: "キーワード検索",
      description:
        "キーワードですべてのタイプ（プラグイン、MCPサーバー、スキル、ワークフロー、フック、コマンド、エージェント）を検索します。デフォルトではすべてのタイプを検索します。ユーザーが特定のタイプのみを要求した場合のみ types パラメータで絞り込んでください。",
      inputSchema: searchSkillsSchema.shape,
    },
    async (input) => {
      const result = await searchSkills(input, database);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  /**
   * get_skill_details - Get details of a specific item
   */
  server.registerTool(
    "get_skill_details",
    {
      title: "詳細取得",
      description:
        "特定のツール（プラグイン、MCPサーバー、スキル、ワークフロー、フック、コマンド、エージェント）の詳細情報を取得します",
      inputSchema: getSkillDetailsSchema.shape,
    },
    async (input) => {
      const result = await getSkillDetails(input, database);
      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: `Not found: ${input.name}`,
            },
          ],
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  /**
   * list_categories - List all categories
   */
  server.registerTool(
    "list_categories",
    {
      title: "カテゴリ一覧",
      description: "利用可能なカテゴリ一覧を取得します",
      inputSchema: z.object({}).shape,
    },
    async () => {
      const result = await listCategories(database);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  /**
   * get_stats - Get database statistics
   */
  server.registerTool(
    "get_stats",
    {
      title: "統計情報",
      description: "データベースの統計情報を取得します",
      inputSchema: z.object({}).shape,
    },
    async () => {
      const result = await getStats(database);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}
