/**
 * GitHub Topic Search
 *
 * Discovers skills by searching GitHub topics
 */

import { ENV } from "../../../config/env.js";
import { AUTO_DISCOVERY_CRITERIA, KNOWN_OFFICIAL_ORGS } from "../../../config/official-skills.js";
import type { Recommendation } from "../../../types/index.js";
import { isTemporaryError, retryWithBackoff } from "../../../utils/retry.js";

type GitHubSearchResult = {
  items: Array<{
    full_name: string;
    html_url: string;
    description: string;
    stargazers_count: number;
    updated_at: string;
    topics: string[];
    owner: {
      login: string;
      html_url: string;
    };
  }>;
};

/**
 * Relevant topics for skill repositories
 */
const RELEVANT_TOPICS = [
  "claude-code",
  "skill",
  "agent-skills",
  "claude-code-skill",
  "ai-agent",
] as const;

/**
 * Get GitHub API headers with optional authentication
 */
function getGitHubHeaders(): Record<string, string> {
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
 * Check if organization is known official
 */
function isOfficialOrg(owner: string): boolean {
  return KNOWN_OFFICIAL_ORGS.includes(owner.toLowerCase());
}

/**
 * Validate repository quality against auto-discovery criteria
 */
function meetsQualityCriteria(repo: GitHubSearchResult["items"][0]): boolean {
  // Check minimum stars
  if (repo.stargazers_count < AUTO_DISCOVERY_CRITERIA.minStars) {
    return false;
  }

  // Check freshness (updated within last N days)
  if (AUTO_DISCOVERY_CRITERIA.minFreshnessDays > 0) {
    const updatedAt = new Date(repo.updated_at);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUTO_DISCOVERY_CRITERIA.minFreshnessDays);
    if (updatedAt < cutoffDate) {
      return false;
    }
  }

  // Check for relevant topics
  if (AUTO_DISCOVERY_CRITERIA.requireTopics) {
    const hasRelevantTopic = repo.topics.some((topic) =>
      RELEVANT_TOPICS.includes(topic.toLowerCase() as (typeof RELEVANT_TOPICS)[number]),
    );
    if (!hasRelevantTopic) {
      return false;
    }
  }

  return true;
}

/**
 * Search GitHub for skills by topics
 */
export async function searchGitHubSkills(limit = 20): Promise<Recommendation[]> {
  // Only run if explicitly enabled
  if (!ENV.GITHUB_TOPIC_SEARCH) {
    return [];
  }

  console.log("🔍 Searching GitHub for skills by topics...");

  try {
    const allSkills: Recommendation[] = [];

    // Search 1: Official organization skills (higher priority)
    console.log("   → Searching official organizations...");
    const officialQueries = [
      "org:anthropics topic:skill OR topic:claude-code-skill",
      "org:supabase topic:agent-skills OR topic:skill",
      "org:vercel topic:ai-sdk OR topic:skill",
      "org:cloudflare topic:ai OR topic:skill",
      "org:stripe topic:agent OR topic:skill",
    ];

    for (const query of officialQueries) {
      try {
        const results = await searchGitHub(query, 10);
        for (const repo of results) {
          if (meetsQualityCriteria(repo)) {
            const skill = createSkillFromSearchResult(repo, true);
            allSkills.push(skill);
          }
        }
      } catch (error) {
        console.warn(`   ⚠ Official search failed for "${query}":`, error);
      }
    }

    console.log(`   ✓ Found ${allSkills.length} official skills`);

    // Search 2: Community skills (lower priority)
    console.log("   → Searching community skills...");
    const communityQuery = "topic:claude-code topic:skill OR topic:agent-skills";
    const communityResults = await searchGitHub(communityQuery, limit);

    for (const repo of communityResults) {
      if (meetsQualityCriteria(repo)) {
        const isOfficial = isOfficialOrg(repo.owner.login);
        const skill = createSkillFromSearchResult(repo, isOfficial);
        allSkills.push(skill);
      }
    }

    console.log(`   ✓ Total found: ${allSkills.length} skills from GitHub search`);

    // Log newly discovered official repos
    const officialSkills = allSkills.filter((s) => s.metrics.isOfficial);
    if (officialSkills.length > 0) {
      console.log("   📋 Official skills discovered:");
      for (const skill of officialSkills) {
        console.log(`      - ${skill.author.name}/${skill.name} (${skill.metrics.stars} ⭐)`);
      }
    }

    return allSkills;
  } catch (error) {
    console.warn("   ⚠ GitHub search failed:", error);
    return [];
  }
}

/**
 * Search GitHub repositories
 */
async function searchGitHub(query: string, limit: number): Promise<GitHubSearchResult["items"]> {
  const perPage = Math.min(limit, 100);
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}&sort=stars`;

  return await retryWithBackoff(
    async () => {
      const response = await fetch(url, {
        headers: getGitHubHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as GitHubSearchResult;
      return data.items;
    },
    {
      maxRetries: 2,
      initialDelay: 1000,
      shouldRetry: isTemporaryError,
    },
  );
}

/**
 * Create a skill from search result
 */
function createSkillFromSearchResult(
  repo: GitHubSearchResult["items"][0],
  isOfficial = false,
): Recommendation {
  const [org, repoName] = repo.full_name.split("/");

  return {
    id: `skill-github-search-${org}-${repoName}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    name: formatRepoName(repoName),
    type: "skill",
    url: repo.html_url,
    description: repo.description || `Skills from ${org}`,
    author: {
      name: org,
      url: repo.owner.html_url,
    },
    category: "Agent Skills",
    tags: [
      "agent skills",
      "skill",
      "github-search",
      ...(isOfficial ? ["official"] : []),
      org.toLowerCase(),
      ...repo.topics,
    ],
    detection: {
      keywords: [...repo.topics, repoName.toLowerCase()],
    },
    metrics: {
      source: isOfficial ? "official" : "community",
      isOfficial,
      stars: repo.stargazers_count,
      lastUpdated: repo.updated_at,
    },
    install: {
      method: "manual",
      command: `git clone ${repo.html_url}`,
    },
  };
}

/**
 * Format repository name
 */
function formatRepoName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
