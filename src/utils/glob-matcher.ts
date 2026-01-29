/**
 * Glob Pattern Matcher
 *
 * Utilities for matching file paths against glob patterns
 */

/**
 * Match a filepath against a glob pattern
 *
 * Supports wildcards:
 * - `*` matches any characters except /
 * - `**` matches any characters including /
 * - `?` matches any single character
 *
 * @param filepath - The file path to test
 * @param pattern - The glob pattern to match against
 * @returns True if the filepath matches the pattern
 *
 * @example
 * matchGlob("src/index.ts", "src/*.ts") // true
 * matchGlob("src/utils/helper.ts", "src/**\/*.ts") // true
 * matchGlob("test.js", "*.ts") // false
 */
export function matchGlob(filepath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*")
    .replace(/\?/g, ".");

  const regex = new RegExp(`^${regexPattern}$`, "i");
  return regex.test(filepath);
}
