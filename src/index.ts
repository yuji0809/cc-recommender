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
    console.log("[DEBUG] Starting cc-recommender MCP server...");

    // Load database
    const database = await recommendationRepository.load();
    console.log(`[DEBUG] Loaded ${database.items.length} recommendations`);

    // Create and start MCP server
    console.log("[DEBUG] Creating MCP server...");
    await createMcpServer(database);
    console.log("[DEBUG] MCP server created and connected");

    // Keep process alive
    process.on("SIGINT", () => {
      console.log("[DEBUG] Received SIGINT, shutting down...");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("[DEBUG] Received SIGTERM, shutting down...");
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
