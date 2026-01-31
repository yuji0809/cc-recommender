/**
 * Official Skill Fetcher
 *
 * Fetches skills from official organization repositories
 * Source: Various official repos (Supabase, Anthropic, etc.)
 */

import {
  OFFICIAL_SKILL_SOURCES,
  SKILL_DIRECTORY_PATTERNS,
  SKILL_FILE_PATTERNS,
} from "../../config/official-skills.js";
import type { Recommendation } from "../../types/domain-types.js";

type GitHubContent = {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url?: string;
  url: string;
};

type GitHubRepo = {
  name: string;
  description: string;
  stargazers_count: number;
  updated_at: string;
  html_url: string;
  owner: {
    login: string;
    html_url: string;
  };
  topics?: string[];
};

/**
 * Fetch skills from official repositories
 */
export async function fetchOfficialSkills(): Promise<Recommendation[]> {
  console.log("🎯 Fetching official skills from organization repositories...");

  const allSkills: Recommendation[] = [];

  for (const source of OFFICIAL_SKILL_SOURCES) {
    try {
      console.log(`   → ${source.name} (${source.org}/${source.repo})`);
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
  const { org, repo, url, priority } = source;

  // Get repository info
  const repoInfo = await fetchRepoInfo(org, repo);
  if (!repoInfo) {
    throw new Error("Failed to fetch repository info");
  }

  // Find skill directories
  const skillDirs = await findSkillDirectories(org, repo);

  if (skillDirs.length === 0) {
    console.log(`     ℹ No skill directories found, checking root README`);
    // Fallback: treat repo itself as a skill
    return [await createSkillFromRepo(source, repoInfo, priority)];
  }

  // Parse each skill directory
  const skills: Recommendation[] = [];
  for (const dir of skillDirs) {
    try {
      const skill = await parseSkillDirectory(org, repo, dir, repoInfo, url, priority);
      if (skill) {
        skills.push(skill);
      }
    } catch (error) {
      console.warn(`     ⚠ Failed to parse skill directory ${dir}:`, error);
    }
  }

  return skills;
}

/**
 * Get GitHub API headers with optional authentication
 */
function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "cc-recommender",
  };

  // Add GitHub token if available (increases rate limit from 60 to 5000 req/hour)
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Get repository information from GitHub API
 */
async function fetchRepoInfo(org: string, repo: string): Promise<GitHubRepo | null> {
  const url = `https://api.github.com/repos/${org}/${repo}`;

  try {
    const response = await fetch(url, {
      headers: getGitHubHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as GitHubRepo;
  } catch (error) {
    console.warn(`     ⚠ Failed to fetch repo info: ${error}`);
    return null;
  }
}

/**
 * Find skill directories in repository
 */
async function findSkillDirectories(org: string, repo: string): Promise<string[]> {
  const skillDirs: string[] = [];

  // Check each pattern
  for (const pattern of SKILL_DIRECTORY_PATTERNS) {
    const contents = await fetchDirectoryContents(org, repo, pattern);
    if (contents && contents.length > 0) {
      // Get subdirectories
      const dirs = contents.filter((item) => item.type === "dir").map((item) => item.path);
      skillDirs.push(...dirs);
    }
  }

  return skillDirs;
}

/**
 * Fetch directory contents from GitHub API
 */
async function fetchDirectoryContents(
  org: string,
  repo: string,
  path: string,
): Promise<GitHubContent[] | null> {
  const url = `https://api.github.com/repos/${org}/${repo}/contents/${path}`;

  try {
    const response = await fetch(url, {
      headers: getGitHubHeaders(),
    });

    if (!response.ok) {
      return null; // Directory doesn't exist
    }

    const data = (await response.json()) as GitHubContent | GitHubContent[];
    return Array.isArray(data) ? data : [data];
  } catch {
    return null;
  }
}

/**
 * Parse a skill directory
 */
async function parseSkillDirectory(
  org: string,
  repo: string,
  dirPath: string,
  repoInfo: GitHubRepo,
  repoUrl: string,
  _priority: number,
): Promise<Recommendation | null> {
  // Get directory contents
  const contents = await fetchDirectoryContents(org, repo, dirPath);
  if (!contents) return null;

  // Find skill file
  let skillFile: GitHubContent | null = null;
  for (const pattern of SKILL_FILE_PATTERNS) {
    const file = contents.find((item) => item.name.toLowerCase() === pattern.toLowerCase());
    if (file) {
      skillFile = file;
      break;
    }
  }

  if (!skillFile || !skillFile.download_url) {
    return null;
  }

  // Download and parse skill file
  const skillContent = await fetchFileContent(skillFile.download_url);
  if (!skillContent) return null;

  // Extract skill name from directory path
  const skillName = dirPath.split("/").pop() || dirPath;

  // Extract description from markdown (first paragraph)
  const description = extractDescription(skillContent) || repoInfo.description;

  // Detect keywords from content
  const keywords = extractKeywords(skillContent, skillName);

  return {
    id: `skill-official-${org}-${skillName}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    name: formatSkillName(skillName),
    type: "skill",
    url: `${repoUrl}/tree/main/${dirPath}`,
    description: description || `Official skill from ${org}`,
    author: {
      name: org,
      url: repoInfo.owner.html_url,
    },
    category: "Agent Skills",
    tags: ["agent skills", "skill", "official", org.toLowerCase(), ...(repoInfo.topics || [])],
    detection: {
      keywords,
    },
    metrics: {
      source: "official",
      isOfficial: true,
      stars: repoInfo.stargazers_count,
      lastUpdated: repoInfo.updated_at,
    },
    install: {
      method: "manual",
      command: `git clone ${repoUrl} && cd ${repo}/${dirPath}`,
    },
  };
}

/**
 * Create a skill from the repository itself (when no skill dirs found)
 */
async function createSkillFromRepo(
  source: (typeof OFFICIAL_SKILL_SOURCES)[0],
  repoInfo: GitHubRepo,
  _priority: number,
): Promise<Recommendation> {
  const { org, repo, url } = source;

  // Try to get README content for better description
  const readmeUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/README.md`;
  const readmeContent = await fetchFileContent(readmeUrl);
  const description = readmeContent
    ? extractDescription(readmeContent) || repoInfo.description
    : repoInfo.description;

  const keywords = readmeContent ? extractKeywords(readmeContent, repo) : [repo.toLowerCase()];

  return {
    id: `skill-official-${org}-${repo}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    name: formatSkillName(repo),
    type: "skill",
    url,
    description: description || `Official skills from ${org}`,
    author: {
      name: org,
      url: repoInfo.owner.html_url,
    },
    category: "Agent Skills",
    tags: ["agent skills", "skill", "official", org.toLowerCase(), ...(repoInfo.topics || [])],
    detection: {
      keywords,
    },
    metrics: {
      source: "official",
      isOfficial: true,
      stars: repoInfo.stargazers_count,
      lastUpdated: repoInfo.updated_at,
    },
    install: {
      method: "manual",
      command: `git clone ${url}`,
    },
  };
}

/**
 * Fetch file content from URL
 */
async function fetchFileContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Extract description from markdown content (first paragraph)
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

    if (foundHeading && trimmed) {
      descriptionLines.push(trimmed);
      if (descriptionLines.join(" ").length > 200) break;
    }

    if (descriptionLines.length > 0 && !trimmed) break;
  }

  const description = descriptionLines.join(" ").slice(0, 500);
  return description || null;
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string, skillName: string): string[] {
  const keywords: string[] = [];
  const text = content.toLowerCase();

  // Technology keywords
  const techKeywords = [
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
  ];

  for (const keyword of techKeywords) {
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
