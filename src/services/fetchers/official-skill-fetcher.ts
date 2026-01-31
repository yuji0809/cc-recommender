/**
 * Official Skill Fetcher (Raw Data Mode)
 *
 * Fetches skills from official organization repositories using raw.githubusercontent.com
 * to avoid GitHub API rate limits
 */

import {
  OFFICIAL_SKILL_SOURCES,
  SKILL_DIRECTORY_PATTERNS,
  SKILL_FILE_PATTERNS,
} from "../../config/official-skills.js";
import type { Recommendation } from "../../types/domain-types.js";
import { isTemporaryError, retryWithBackoff } from "../../utils/retry.js";

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
 * Fetch skills from official repositories
 */
export async function fetchOfficialSkills(): Promise<Recommendation[]> {
  console.log("🎯 Fetching official skills (using raw data to avoid API limits)...");

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
 * Fetch skills from a single repository using raw data
 */
async function fetchSkillsFromRepo(
  source: (typeof OFFICIAL_SKILL_SOURCES)[0],
): Promise<Recommendation[]> {
  const { org, repo, url } = source;

  // Get repository metadata from README (no API needed!)
  const metadata = await fetchRepoMetadata(org, repo, url);

  // Try known skill directory patterns
  const skills: Recommendation[] = [];

  for (const pattern of SKILL_DIRECTORY_PATTERNS) {
    const foundSkills = await findSkillsInDirectory(org, repo, pattern, metadata, url);
    skills.push(...foundSkills);
  }

  // If no skills found, treat repo itself as a skill
  if (skills.length === 0) {
    console.log(`     ℹ No skill directories found, treating repo as skill`);
    const repoSkill = createSkillFromRepo(source, metadata);
    skills.push(repoSkill);
  }

  return skills;
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

  // Try to list directory contents from README or known structure
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
  // For known repos, use hardcoded skill names
  const knownSkills: Record<string, string[]> = {
    "anthropics/skills": ["docx", "pdf", "pptx", "xlsx"],
    "supabase/agent-skills": ["supabase-postgres-best-practices"],
  };

  const repoKey = `${org}/${repo}`;
  if (knownSkills[repoKey]) {
    return knownSkills[repoKey];
  }

  // Try to fetch a directory listing file if it exists
  // (Some repos have a manifest or list file)
  const listUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/${dirPattern}/README.md`;
  const listContent = await fetchRawFile(listUrl);

  if (listContent) {
    // Extract skill names from markdown links or list items
    const skillNames = extractSkillNamesFromMarkdown(listContent);
    if (skillNames.length > 0) {
      return skillNames;
    }
  }

  // Fallback: return empty array
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
 * Create a skill from the repository itself
 */
function createSkillFromRepo(
  source: (typeof OFFICIAL_SKILL_SOURCES)[0],
  metadata: RepoMetadata,
): Recommendation {
  const { org, repo, url } = source;

  return {
    id: `skill-official-${org}-${repo}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    name: formatSkillName(repo),
    type: "skill",
    url,
    description: metadata.description,
    author: {
      name: org,
      url: metadata.ownerUrl,
    },
    category: "Agent Skills",
    tags: ["agent skills", "skill", "official", org.toLowerCase(), ...metadata.topics],
    detection: {
      keywords: [repo.toLowerCase(), ...metadata.topics],
    },
    metrics: {
      source: "official",
      isOfficial: true,
      stars: metadata.stars,
    },
    install: {
      method: "manual",
      command: `git clone ${url}`,
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
    "docx",
    "pdf",
    "pptx",
    "xlsx",
    "excel",
    "word",
    "powerpoint",
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
