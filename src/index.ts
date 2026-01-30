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
  try {
    console.error("[DEBUG] Starting cc-recommender MCP server...");

    // Load database
    const database = await recommendationRepository.load();
    console.error(`[DEBUG] Loaded ${database.items.length} recommendations`);

    // Create and start MCP server
    console.error("[DEBUG] Creating MCP server...");
    await createMcpServer(database);
    console.error("[DEBUG] MCP server created and connected");

    // Keep process alive
    process.on("SIGINT", () => {
      console.error("[DEBUG] Received SIGINT, shutting down...");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.error("[DEBUG] Received SIGTERM, shutting down...");
      process.exit(0);
    });
  } catch (error) {
    console.error("[ERROR] Failed to start server:", error);
    throw error;
  }
}

// Run
main().catch((error) => {
  console.error("[FATAL] Fatal error:", error);
  process.exit(1);
});
