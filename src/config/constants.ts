/**
 * General Constants
 *
 * Application-wide constants and configuration values
 */

import { createRequire } from "node:module";

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

/**
 * package.json（src/config/ と dist/config/ のどちらからも 2 階層上）
 * rootDir の外にあるため import ではなく createRequire で読み込む
 */
const packageJson = createRequire(import.meta.url)("../../package.json") as {
  name: string;
  version: string;
};

/** Application metadata（package.json から取得し、リリースごとに更新が要らないようにする） */
export const APP_METADATA = {
  name: packageJson.name,
  version: packageJson.version,
} as const;

/** Security scanning configuration */
export const SECURITY_CONFIG = {
  /** Minimum security score (0-100) required to include an item in the database */
  minSecurityScore: 70,
  /** Whether to exclude items with undefined security scores */
  excludeUnscored: false,
} as const;
