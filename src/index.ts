#!/usr/bin/env node

/**
 * cc-recommender MCP Server
 *
 * Recommends Claude Code skills, plugins, and MCP servers
 * based on project analysis
 */

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getSkillDetails,
  getSkillDetailsSchema,
  getStats,
  listCategories,
  recommendSkills,
  recommendSkillsSchema,
  searchSkills,
  searchSkillsSchema,
} from "./tools/index.js";
import type { RecommendationDatabase } from "./types/index.js";

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database path
const DATABASE_PATH = join(__dirname, "..", "data", "recommendations.json");

// Global database instance
let database: RecommendationDatabase;

/**
 * Load the recommendations database
 */
async function loadDatabase(): Promise<RecommendationDatabase> {
  try {
    const content = await readFile(DATABASE_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to load database:", error);
    // Return empty database
    return {
      version: "0.0.0",
      lastUpdated: new Date().toISOString(),
      items: [],
    };
  }
}

/**
 * Main entry point
 */
async function main() {
  // Load database
  database = await loadDatabase();
  console.error(`Loaded ${database.items.length} recommendations`);

  // Create MCP server
  const server = new McpServer(
    {
      name: "cc-recommender",
      version: "0.1.0",
    },
    {
      capabilities: {},
    },
  );

  // Register tools

  /**
   * recommend_skills - Analyze project and recommend
   */
  server.registerTool(
    "recommend_skills",
    {
      title: "プロジェクト推薦",
      description: "プロジェクトを分析し、適切なスキル、プラグイン、MCPサーバーを推薦します",
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
      description: "キーワードでスキル、プラグイン、MCPサーバーを検索します",
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
      description: "特定のスキル、プラグイン、MCPサーバーの詳細を取得します",
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

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("cc-recommender MCP server started");
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
