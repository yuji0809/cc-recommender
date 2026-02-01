/**
 * General Constants
 *
 * Application-wide constants and configuration values
 */

/** File scanning configuration */
export const FILE_SCAN_CONFIG = {
  maxDepth: 5, // Maximum recursion depth for directory scanning
  maxFiles: 1000, // Maximum number of files to scan
} as const;

/** Directories to skip during file scanning */
export const SKIP_DIRECTORIES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "coverage",
  ".cache",
  ".vscode",
  ".idea",
  "__pycache__",
  "venv",
  ".venv",
  "target", // Rust
  "vendor", // PHP/Go
] as const;

/** Application metadata */
export const APP_METADATA = {
  name: "cc-recommender",
  version: "0.1.0",
} as const;

/** Security scanning configuration */
export const SECURITY_CONFIG = {
  /** Minimum security score (0-100) required to include an item in the database */
  minSecurityScore: 70,
  /** Whether to exclude items with undefined security scores */
  excludeUnscored: false,
} as const;
