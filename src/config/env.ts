/**
 * Environment Variable Configuration
 *
 * Centralized environment variable access with:
 * - Type safety
 * - Default values
 * - Single source of truth
 * - Easy testing and mocking
 */

export type EnvConfig = {
  /** GitHub API token for authenticated requests (rate limit: 5000/hour vs 60/hour) */
  readonly GITHUB_TOKEN: string | undefined;

  /** Skip security scanning during data fetch (for faster development) */
  readonly SKIP_SECURITY_SCAN: boolean;

  /** Offline mode - use cached data instead of fetching from remote */
  readonly CC_RECOMMENDER_OFFLINE_MODE: boolean;

  /** Types to fetch (plugins, mcp, skills) - comma-separated, or undefined for all */
  readonly FETCH_TYPES: Set<"plugins" | "mcp" | "skills"> | undefined;
};

/**
 * Parse FETCH_TYPES environment variable
 * Returns Set of types to fetch, or undefined for all types
 */
function parseFetchTypes(): Set<"plugins" | "mcp" | "skills"> | undefined {
  const fetchTypes = process.env.FETCH_TYPES;
  if (!fetchTypes) {
    return undefined; // Fetch all types
  }

  const types = fetchTypes
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t === "plugins" || t === "mcp" || t === "skills") as Array<
    "plugins" | "mcp" | "skills"
  >;

  return types.length > 0 ? new Set(types) : undefined;
}

/**
 * Parse and validate environment variables
 * Called once at module load time (cached)
 */
function loadEnvConfig(): EnvConfig {
  return {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || undefined,
    SKIP_SECURITY_SCAN: process.env.SKIP_SECURITY_SCAN === "true",
    CC_RECOMMENDER_OFFLINE_MODE: process.env.CC_RECOMMENDER_OFFLINE_MODE === "true",
    FETCH_TYPES: parseFetchTypes(),
  };
}

/**
 * Environment configuration (loaded once, cached)
 *
 * @example
 * ```typescript
 * import { ENV } from "../config/env.js";
 *
 * if (ENV.GITHUB_TOKEN) {
 *   headers.Authorization = `Bearer ${ENV.GITHUB_TOKEN}`;
 * }
 * ```
 */
export const ENV = loadEnvConfig();
