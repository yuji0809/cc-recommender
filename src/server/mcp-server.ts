/**
 * MCP Server Setup
 *
 * Creates and configures the MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { RecommendationDatabase } from "../types/domain-types.js";
import { registerTools } from "./tool-registry.js";

/**
 * Create and start the MCP server
 */
export async function createMcpServer(database: RecommendationDatabase): Promise<void> {
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
  registerTools(server, database);

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("cc-recommender MCP server started");
}
