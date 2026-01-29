#!/usr/bin/env node
/**
 * cc-recommender MCP Server
 * 
 * Recommends Claude Code skills, plugins, and MCP servers
 * based on project analysis
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import type { RecommendationDatabase } from "./types/index.js";
import {
  recommendSkillsSchema,
  recommendSkills,
  searchSkillsSchema,
  searchSkills,
  getSkillDetailsSchema,
  getSkillDetails,
  listCategories,
  getStats,
} from "./tools/index.js";

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
  const server = new McpServer({
    name: "cc-recommender",
    version: "0.1.0",
  });
  
  // Register tools
  
  /**
   * recommend_skills - Analyze project and recommend
   */
  server.tool(
    "recommend_skills",
    "プロジェクトを分析し、適切なスキル、プラグイン、MCPサーバーを推薦します",
    recommendSkillsSchema.shape,
    async (params) => {
      try {
        const result = await recommendSkills(params as any, database);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
  
  /**
   * search_skills - Search by keyword
   */
  server.tool(
    "search_skills",
    "キーワードでスキル、プラグイン、MCPサーバーを検索します",
    searchSkillsSchema.shape,
    async (params) => {
      try {
        const result = await searchSkills(params as any, database);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
  
  /**
   * get_skill_details - Get details of a specific item
   */
  server.tool(
    "get_skill_details",
    "特定のスキル、プラグイン、MCPサーバーの詳細を取得します",
    getSkillDetailsSchema.shape,
    async (params) => {
      try {
        const result = await getSkillDetails(params as any, database);
        if (!result) {
          return {
            content: [
              {
                type: "text",
                text: `Not found: ${(params as any).name}`,
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
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
  
  /**
   * list_categories - List all categories
   */
  server.tool(
    "list_categories",
    "利用可能なカテゴリ一覧を取得します",
    {},
    async () => {
      try {
        const result = await listCategories(database);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
  
  /**
   * get_stats - Get database statistics
   */
  server.tool(
    "get_stats",
    "データベースの統計情報を取得します",
    {},
    async () => {
      try {
        const result = await getStats(database);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
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
