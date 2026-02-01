/**
 * GitHub API utilities for skill fetching
 */

import { ENV } from "../../../../config/env.js";
import { isTemporaryError, retryWithBackoff } from "../../../../utils/retry.js";

/**
 * Get GitHub API headers with optional authentication
 */
export function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "cc-recommender",
  };

  if (ENV.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${ENV.GITHUB_TOKEN}`;
  }

  return headers;
}

/**
 * Auto-discover skills from GitHub repository using API
 * Returns empty array if API fails (will fall back to knownSkills)
 */
export async function autoDiscoverSkills(
  org: string,
  repo: string,
  skillsPath: string,
): Promise<string[]> {
  try {
    const url = `https://api.github.com/repos/${org}/${repo}/contents/${skillsPath}`;
    const response = await fetch(url, {
      headers: getGitHubHeaders(),
    });

    if (!response.ok) {
      // API failed, log status for debugging
      console.log(
        `   ⚠ GitHub API failed for ${org}/${repo}/${skillsPath}: HTTP ${response.status}`,
      );
      return [];
    }

    const data = (await response.json()) as Array<{
      name: string;
      type: string;
    }>;

    // Filter directories only
    const skillNames = data.filter((item) => item.type === "dir").map((item) => item.name);

    console.log(
      `   ✓ Auto-discovered ${skillNames.length} items from ${org}/${repo}/${skillsPath}`,
    );
    return skillNames;
  } catch (error) {
    console.log(`   ⚠ Auto-discovery exception for ${org}/${repo}/${skillsPath}:`, error);
    return [];
  }
}

/**
 * Fetch raw file from GitHub (no API limit!)
 */
export async function fetchRawFile(url: string): Promise<string | null> {
  try {
    return await retryWithBackoff(
      async () => {
        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 404) {
            return null; // File doesn't exist
          }
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.text();
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        shouldRetry: isTemporaryError,
      },
    );
  } catch {
    return null;
  }
}
