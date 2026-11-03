/**
 * MCP Server Setup
 *
 * Creates and configures the MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { APP_METADATA } from "../config/constants.js";
import type { RecommendationDatabase } from "../types/domain-types.js";
import { logger } from "../utils/logger.js";
import { registerTools } from "./tool-registry.js";

/**
 * Create and start the MCP server
 */
export async function createMcpServer(database: RecommendationDatabase): Promise<void> {
  // Create MCP server
  const server = new McpServer(
    {
      name: APP_METADATA.name,
      version: APP_METADATA.version,
    },
    {
      capabilities: {},
    },
  );

  // Register tools
  registerTools(server, database);

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("cc-recommender MCP server started");
}
