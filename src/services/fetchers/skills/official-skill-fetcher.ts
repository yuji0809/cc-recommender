/**
 * Official Skill Fetcher (Raw Data Mode)
 *
 * Fetches skills from official organization repositories using raw.githubusercontent.com
 * to avoid GitHub API rate limits
 */

import { ENV } from "../../../config/env.js";
import {
  OFFICIAL_SKILL_SOURCES,
  SKILL_DIRECTORY_PATTERNS,
  SKILL_FILE_PATTERNS,
} from "../../../config/official-skills.js";
import type { Recommendation } from "../../../types/domain-types.js";
import { isTemporaryError, retryWithBackoff } from "../../../utils/retry.js";

type RepoMetadata = {
  name: string;
  description: string;
  stars: number;
  url: string;
  owner: string;
  ownerUrl: string;
  topics: string[];
};

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
 * Auto-discover skills from GitHub repository using API
 * Returns empty array if API fails (will fall back to knownSkills)
 */
async function autoDiscoverSkills(
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
      // API failed, will fall back to knownSkills
      return [];
    }

    const data = (await response.json()) as Array<{
      name: string;
      type: string;
    }>;

    // Filter directories only
    const skillNames = data.filter((item) => item.type === "dir").map((item) => item.name);

    console.log(`   ✓ Auto-discovered ${skillNames.length} skills from ${org}/${repo}`);
    return skillNames;
  } catch {
    console.log(`   ⚠ Auto-discovery failed for ${org}/${repo}, using fallback`);
    return [];
  }
}

/**
 * Technology keywords for skill detection
 */
const TECH_KEYWORDS = [
  "supabase",
  "postgres",
  "postgresql",
  "database",
  "sql",
  "react",
  "nextjs",
  "next.js",
  "vue",
  "angular",
  "svelte",
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "java",
  "node",
  "deno",
  "bun",
  "docker",
  "kubernetes",
  "k8s",
  "aws",
  "gcp",
  "azure",
  "mongodb",
  "redis",
  "git",
  "github",
  "gitlab",
  "api",
  "rest",
  "graphql",
  "test",
  "testing",
  "jest",
  "vitest",
  "ci",
  "cd",
  "devops",
  "security",
  "auth",
  "authentication",
  "ai",
  "ml",
  "llm",
  "docx",
  "pdf",
  "pptx",
  "xlsx",
  "excel",
  "word",
  "powerpoint",
] as const;

/**
 * Fetch skills from official repositories
 */
export async function fetchOfficialSkills(): Promise<Recommendation[]> {
  console.log("🎯 Fetching official skills (auto-discovery + raw data)...");

  const allSkills: Recommendation[] = [];

  for (const source of OFFICIAL_SKILL_SOURCES) {
    try {
      const mode = source.autoDiscover ? "auto-discover" : "manual";
      console.log(`   → ${source.name} (${source.org}/${source.repo}) [${mode}]`);
      const skills = await fetchSkillsFromRepo(source);
      allSkills.push(...skills);
      console.log(`     ✓ Found ${skills.length} skills`);
    } catch (error) {
      console.warn(`     ⚠ Failed to fetch from ${source.name}:`, error);
    }
  }

  console.log(`   ✓ Total official skills: ${allSkills.length}`);
  return allSkills;
}

/**
 * Fetch skills from a single repository
 */
async function fetchSkillsFromRepo(
  source: (typeof OFFICIAL_SKILL_SOURCES)[0],
): Promise<Recommendation[]> {
  const { org, repo, url, autoDiscover, skillsPath, knownSkills } = source;

  // Get repository metadata from README
  const metadata = await fetchRepoMetadata(org, repo, url);
  const skills: Recommendation[] = [];

  // Case 1: Auto-discovery enabled with skillsPath
  if (autoDiscover && skillsPath) {
    const discoveredSkills = await autoDiscoverSkills(org, repo, skillsPath);

    if (discoveredSkills.length > 0) {
      // Success: Parse discovered skills
      for (const skillName of discoveredSkills) {
        try {
          const skillPath = `${skillsPath}/${skillName}`;
          const skill = await parseSkillFromRaw(org, repo, skillPath, metadata, url);
          if (skill) {
            skills.push(skill);
          }
        } catch {
          // Skill file doesn't exist, skip
        }
      }
      return skills;
    }

    // Auto-discovery failed: Use knownSkills as fallback (only once)
    if (knownSkills && knownSkills.length > 0) {
      console.log(`   ⚠ Auto-discovery failed, using ${knownSkills.length} known skills`);
      for (const skillName of knownSkills) {
        try {
          const skillPath = `${skillsPath}/${skillName}`;
          const skill = await parseSkillFromRaw(org, repo, skillPath, metadata, url);
          if (skill) {
            skills.push(skill);
          }
        } catch {
          // Skill file doesn't exist, skip
        }
      }
      return skills;
    }
  }

  // Case 2: skillsPath specified without auto-discovery
  if (skillsPath && !autoDiscover) {
    const foundSkills = await findSkillsInDirectory(org, repo, skillsPath, metadata, url);
    skills.push(...foundSkills);
    if (skills.length > 0) {
      return skills;
    }
  }

  // Case 3: No configuration → Try all patterns
  if (!skillsPath && !knownSkills) {
    for (const pattern of SKILL_DIRECTORY_PATTERNS) {
      const foundSkills = await findSkillsInDirectory(org, repo, pattern, metadata, url);
      skills.push(...foundSkills);
    }
    if (skills.length > 0) {
      return skills;
    }
  }

  // Case 4: No skills found → Return empty array
  console.log(`     ℹ No individual skills found in repository`);
  return [];
}

/**
 * Get repository metadata from README (no API needed!)
 */
async function fetchRepoMetadata(
  org: string,
  repo: string,
  repoUrl: string,
): Promise<RepoMetadata> {
  // Try to fetch README to get description
  const readmeUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/README.md`;
  const readme = await fetchRawFile(readmeUrl);

  let description = "";
  let topics: string[] = [];

  if (readme) {
    // Extract first paragraph as description
    description = extractDescription(readme) || "";
    // Extract topics from badges
    topics = extractTopicsFromReadme(readme);
  }

  return {
    name: repo,
    description: description || `Official skills from ${org}`,
    stars: 0, // Will be filled by quality scoring later if needed
    url: repoUrl,
    owner: org,
    ownerUrl: `https://github.com/${org}`,
    topics,
  };
}

/**
 * Find skills in a directory by trying known patterns
 */
async function findSkillsInDirectory(
  org: string,
  repo: string,
  dirPattern: string,
  metadata: RepoMetadata,
  repoUrl: string,
): Promise<Recommendation[]> {
  const skills: Recommendation[] = [];

  // Try to list directory contents from README
  const skillNames = await discoverSkillsInDirectory(org, repo, dirPattern);

  for (const skillName of skillNames) {
    try {
      const skillPath = `${dirPattern}/${skillName}`;
      const skill = await parseSkillFromRaw(org, repo, skillPath, metadata, repoUrl);
      if (skill) {
        skills.push(skill);
      }
    } catch {
      // Skill file doesn't exist, skip
    }
  }

  return skills;
}

/**
 * Discover skills by trying common names or parsing directory listing
 */
async function discoverSkillsInDirectory(
  org: string,
  repo: string,
  dirPattern: string,
): Promise<string[]> {
  // Try to fetch a directory listing file if it exists
  const listUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/${dirPattern}/README.md`;
  const listContent = await fetchRawFile(listUrl);

  if (listContent) {
    // Extract skill names from markdown links or list items
    const skillNames = extractSkillNamesFromMarkdown(listContent);
    if (skillNames.length > 0) {
      return skillNames;
    }
  }

  // No skills found
  return [];
}

/**
 * Parse a skill from raw files
 */
async function parseSkillFromRaw(
  org: string,
  repo: string,
  skillPath: string,
  metadata: RepoMetadata,
  repoUrl: string,
): Promise<Recommendation | null> {
  // Try each skill file pattern
  let skillContent: string | null = null;

  for (const pattern of SKILL_FILE_PATTERNS) {
    const fileUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/${skillPath}/${pattern}`;
    skillContent = await fetchRawFile(fileUrl);
    if (skillContent) {
      break;
    }
  }

  if (!skillContent) {
    return null;
  }

  // Extract skill name from path
  const skillName = skillPath.split("/").pop() || skillPath;

  // Extract description and keywords from content
  const description = extractDescription(skillContent) || metadata.description;
  const keywords = extractKeywords(skillContent, skillName);

  return {
    id: `skill-official-${org}-${skillName}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    name: formatSkillName(skillName),
    type: "skill",
    url: `${repoUrl}/tree/main/${skillPath}`,
    description: description || `Official skill from ${org}`,
    author: {
      name: org,
      url: metadata.ownerUrl,
    },
    category: "Agent Skills",
    tags: ["agent skills", "skill", "official", org.toLowerCase(), ...metadata.topics],
    detection: {
      keywords,
    },
    metrics: {
      source: "official",
      isOfficial: true,
      stars: metadata.stars,
    },
    install: {
      method: "manual",
      command: `git clone ${repoUrl} && cd ${repo}/${skillPath}`,
    },
  };
}

/**
 * Fetch raw file from GitHub (no API limit!)
 */
async function fetchRawFile(url: string): Promise<string | null> {
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

/**
 * Extract description from markdown content
 */
function extractDescription(content: string): string | null {
  // Remove frontmatter if exists
  const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n/, "");

  // Find first paragraph (after heading)
  const lines = withoutFrontmatter.split("\n");
  let foundHeading = false;
  const descriptionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("#")) {
      foundHeading = true;
      continue;
    }

    if (foundHeading && trimmed && !trimmed.startsWith("[") && !trimmed.startsWith("!")) {
      descriptionLines.push(trimmed);
      if (descriptionLines.join(" ").length > 200) break;
    }

    if (descriptionLines.length > 0 && !trimmed) break;
  }

  const description = descriptionLines.join(" ").slice(0, 500);
  return description || null;
}

/**
 * Extract topics from README badges
 */
function extractTopicsFromReadme(content: string): string[] {
  const topics: string[] = [];
  const badgeRegex = /\[!\[.*?\]\(.*?\)\]\(https:\/\/github\.com\/.*?\/topics\/([\w-]+)\)/g;

  const matches = content.matchAll(badgeRegex);
  for (const match of matches) {
    if (match[1]) {
      topics.push(match[1]);
    }
  }

  return topics;
}

/**
 * Extract skill names from markdown
 */
function extractSkillNamesFromMarkdown(content: string): string[] {
  const skillNames: string[] = [];

  // Match markdown links: [name](path) or - name
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const listRegex = /^[-*]\s+(.+)$/gm;

  // Extract from links
  const linkMatches = content.matchAll(linkRegex);
  for (const match of linkMatches) {
    if (match[2]?.includes("skills/")) {
      const skillName = match[2].split("/").pop()?.replace(/\.md$/, "");
      if (skillName) {
        skillNames.push(skillName);
      }
    }
  }

  // Extract from list items
  const listMatches = content.matchAll(listRegex);
  for (const match of listMatches) {
    const item = match[1]?.trim();
    if (item && !item.startsWith("[")) {
      skillNames.push(item.toLowerCase().replace(/\s+/g, "-"));
    }
  }

  return [...new Set(skillNames)];
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string, skillName: string): string[] {
  const keywords: string[] = [];
  const text = content.toLowerCase();

  // Technology keywords
  for (const keyword of TECH_KEYWORDS) {
    if (text.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  // Add skill name components as keywords
  const nameWords = skillName
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter((w) => w.length > 2);
  keywords.push(...nameWords);

  return [...new Set(keywords)];
}

/**
 * Format skill name (convert kebab-case to Title Case)
 */
function formatSkillName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
