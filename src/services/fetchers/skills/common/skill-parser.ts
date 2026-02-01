/**
 * Skill parsing utilities
 */

import { SKILL_FILE_PATTERNS } from "../../../../config/direct-skill-sources.js";
import type { Recommendation } from "../../../../types/domain-types.js";
import { fetchRawFile } from "./github-api.js";
import type { RepoMetadata } from "./types.js";

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
 * Parse a skill from raw files
 */
export async function parseSkillFromRaw(
  org: string,
  repo: string,
  skillPath: string,
  metadata: RepoMetadata,
  repoUrl: string,
): Promise<Recommendation | null> {
  // Try each skill file pattern
  let skillContent: string | null = null;

  // Normalize path (remove leading/trailing slashes and dots)
  const normalizedPath = skillPath.replace(/^\.?\/?/, "").replace(/\/$/, "");

  for (const pattern of SKILL_FILE_PATTERNS) {
    // Construct clean URL
    const pathPart = normalizedPath ? `${normalizedPath}/` : "";
    const fileUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/${pathPart}${pattern}`;
    skillContent = await fetchRawFile(fileUrl);
    if (skillContent) {
      break;
    }
  }

  if (!skillContent) {
    return null;
  }

  // Extract skill name from path (use repo name if path is empty/root)
  let skillName: string;
  if (!normalizedPath || normalizedPath === ".") {
    skillName = repo; // Use repository name for root-level skills
  } else {
    skillName = normalizedPath.split("/").pop() || repo;
  }

  // Validate skill name (must not be empty)
  if (!skillName || skillName.trim() === "") {
    console.log(`     ⚠ Skipping skill with empty name from ${org}/${repo}/${skillPath}`);
    return null;
  }

  // Extract description and keywords from content
  const description = extractDescription(skillContent) || metadata.description;
  const keywords = extractKeywords(skillContent, skillName);

  // Construct final URL
  const finalPath = normalizedPath || "";
  const skillUrl = finalPath ? `${repoUrl}/tree/main/${finalPath}` : repoUrl;

  return {
    id: `skill-official-${org}-${skillName}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    name: formatSkillName(skillName),
    type: "skill",
    url: skillUrl,
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
      command: finalPath
        ? `git clone ${repoUrl} && cd ${repo}/${finalPath}`
        : `git clone ${repoUrl}`,
    },
  };
}

/**
 * Get repository metadata from README (no API needed!)
 */
export async function fetchRepoMetadata(
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
 * Extract description from markdown content
 */
export function extractDescription(content: string): string | null {
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
export function extractTopicsFromReadme(content: string): string[] {
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
 * Extract keywords from content
 */
export function extractKeywords(content: string, skillName: string): string[] {
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
export function formatSkillName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Extract skill names from markdown
 */
export function extractSkillNamesFromMarkdown(content: string): string[] {
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
