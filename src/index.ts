#!/usr/bin/env node

/**
 * cc-recommender MCP Server
 *
 * Recommends Claude Code skills, plugins, and MCP servers
 * based on project analysis
 */

import { recommendationRepository } from "./repositories/recommendation.repository.js";
import { createMcpServer } from "./server/mcp-server.js";
import { logger } from "./utils/logger.js";

/**
 * Main entry point
 */
async function main() {
  try {
    logger.info("[DEBUG] Starting cc-recommender MCP server...");

    // Load database
    const database = await recommendationRepository.load();
    logger.info(`[DEBUG] Loaded ${database.items.length} recommendations`);

    // Create and start MCP server
    logger.info("[DEBUG] Creating MCP server...");
    await createMcpServer(database);
    logger.info("[DEBUG] MCP server created and connected");

    // Keep process alive
    process.on("SIGINT", () => {
      logger.info("[DEBUG] Received SIGINT, shutting down...");
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      logger.info("[DEBUG] Received SIGTERM, shutting down...");
      process.exit(0);
    });
  } catch (error) {
    logger.error("[ERROR] Failed to start server:", error);
    throw error;
  }
}

// Run
main().catch((error) => {
  logger.error("[FATAL] Fatal error:", error);
  process.exit(1);
});
