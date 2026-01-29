#!/usr/bin/env node

/**
 * cc-recommender MCP Server
 *
 * Recommends Claude Code skills, plugins, and MCP servers
 * based on project analysis
 */

import { recommendationRepository } from "./repositories/recommendation.repository.js";
import { createMcpServer } from "./server/mcp-server.js";

/**
 * Main entry point
 */
async function main() {
  // Load database
  const database = await recommendationRepository.load();
  console.error(`Loaded ${database.items.length} recommendations`);

  // Create and start MCP server
  await createMcpServer(database);
}

// Run
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
