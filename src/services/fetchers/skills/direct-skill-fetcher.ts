/**
 * Direct Skill Fetcher (Automatic Recursive Discovery)
 *
 * Automatically discovers and fetches skills from GitHub repositories:
 * 1. If URL contains specific path (/tree/main/skills/xxx) → fetch that skill directly
 * 2. Otherwise → recursively explore repository structure:
 *    - Find "skills" or ".claude/skills" directory
 *    - Recursively explore all subdirectories
 *    - Detect skill.md files and extract skills
 */

import {
  DIRECT_SKILL_SOURCES,
  type DirectSkillSource,
  SKILL_FILE_PATTERNS,
} from "../../../config/direct-skill-sources.js";
import type { Recommendation } from "../../../types/domain-types.js";
import { autoDiscoverSkills, fetchRawFile } from "./common/github-api.js";
import { fetchRepoMetadata, parseSkillFromRaw } from "./common/skill-parser.js";
import type { RepoMetadata } from "./common/types.js";

/**
 * Common skill directory names to try
 */
const SKILL_DIR_PATTERNS = ["skills", ".claude/skills"];

/**
 * Fallback: Known skills for each repository
 * Used when GitHub API fails (rate limit) and README parsing doesn't work
 */
const KNOWN_SKILLS_BY_REPO: Record<string, string[]> = {
  "anthropics/skills": [
    "algorithmic-art",
    "brand-guidelines",
    "canvas-design",
    "doc-coauthoring",
    "docx",
    "frontend-design",
    "internal-comms",
    "mcp-builder",
    "pdf",
    "pptx",
    "skill-creator",
    "slack-gif-creator",
    "theme-factory",
    "web-artifacts-builder",
    "webapp-testing",
    "xlsx",
  ],
  "vercel-labs/agent-skills": ["ai-sdk", "nextjs-app-router", "nextjs-pages-router", "v0"],
  "openai/skills": [
    // .curated subdirectory (27 skills)
    ".curated/atlas",
    ".curated/cloudflare-deploy",
    ".curated/develop-web-game",
    ".curated/doc",
    ".curated/figma-implement-design",
    ".curated/gh-address-comments",
    ".curated/gh-fix-ci",
    ".curated/imagegen",
    ".curated/jupyter-notebook",
    ".curated/linear",
    ".curated/netlify-deploy",
    ".curated/notion-knowledge-capture",
    ".curated/notion-meeting-intelligence",
    ".curated/notion-research-documentation",
    ".curated/notion-spec-to-implementation",
    ".curated/openai-docs",
    ".curated/pdf",
    ".curated/playwright",
    ".curated/render-deploy",
    ".curated/screenshot",
    ".curated/sentry",
    ".curated/sora",
    ".curated/speech",
    ".curated/spreadsheet",
    ".curated/transcribe",
    ".curated/vercel-deploy",
    ".curated/yeet",
    // .experimental subdirectory (4 skills)
    ".experimental/codex-readiness-integration-test",
    ".experimental/codex-readiness-unit-test",
    ".experimental/create-plan",
    ".experimental/gitlab-address-comments",
  ],
  "supabase/agent-skills": ["supabase-postgres-best-practices"],
  "lackeyjb/playwright-skill": ["playwright-skill"],
  "obra/superpowers": [
    "brainstorming",
    "dispatching-parallel-agents",
    "executing-plans",
    "finishing-a-development-branch",
    "receiving-code-review",
    "requesting-code-review",
    "subagent-driven-development",
    "systematic-debugging",
    "test-driven-development",
    "using-git-worktrees",
    "using-superpowers",
    "verification-before-completion",
    "writing-plans",
    "writing-skills",
  ],
};

/**
 * Fetch skills from direct skill repositories
 */
export async function fetchDirectSkills(): Promise<Recommendation[]> {
  console.log("🎯 Fetching from direct repositories (auto-discovery)...");

  const allSkills: Recommendation[] = [];

  for (const source of DIRECT_SKILL_SOURCES) {
    try {
      console.log(`   → ${source.name} (${source.org}/${source.repo})`);
      const skills = await fetchSkillsFromRepo(source);
      allSkills.push(...skills);
      console.log(`     ✓ Found ${skills.length} skills`);
    } catch (error) {
      console.warn(`     ⚠ Failed to fetch from ${source.name}:`, error);
    }
  }

  console.log(`   ✓ Total from direct repositories: ${allSkills.length}`);
  return allSkills;
}

/**
 * Fetch skills from a single repository (automatic discovery)
 */
async function fetchSkillsFromRepo(source: DirectSkillSource): Promise<Recommendation[]> {
  const { org, repo, url } = source;

  // Get repository metadata
  const metadata = await fetchRepoMetadata(org, repo, url);

  // Step 1: Check if URL contains specific skill path
  const skillPathFromUrl = extractSkillPathFromUrl(url);
  if (skillPathFromUrl) {
    console.log(`     → Direct skill path from URL: ${skillPathFromUrl}`);
    const skill = await parseSkillFromRaw(org, repo, skillPathFromUrl, metadata, url);
    return skill ? [skill] : [];
  }

  // Step 2: Auto-discover from repository root
  console.log(`     → Auto-discovering skills...`);
  const skills = await autoDiscoverSkillsRecursively(org, repo, metadata, url);

  if (skills.length === 0) {
    console.log(`     ℹ No skills found`);
  }

  return skills;
}

/**
 * Extract skill path from URL if it contains specific path
 * Example: https://github.com/org/repo/tree/main/skills/xxx → "skills/xxx"
 */
function extractSkillPathFromUrl(url: string): string | null {
  const match = url.match(/\/tree\/main\/(.+)$/);
  return match ? match[1] : null;
}

/**
 * Extract skill names from README file in the skills directory
 */
async function extractSkillNamesFromReadme(
  org: string,
  repo: string,
  skillDir: string,
): Promise<string[]> {
  // Try to fetch README from skills directory
  const readmeUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/${skillDir}/README.md`;
  const readme = await fetchRawFile(readmeUrl);

  if (!readme) {
    return [];
  }

  const skillNames: string[] = [];

  // Extract links pointing to subdirectories
  // Pattern: [name](./subdir) or [name](subdir)
  const linkRegex = /\[([^\]]+)\]\(\.?\/?([a-zA-Z0-9_.-]+)\)/g;
  const matches = readme.matchAll(linkRegex);

  for (const match of matches) {
    const skillName = match[2];
    // Skip external links and parent directory
    if (!skillName.includes("http") && !skillName.includes("..") && skillName !== ".") {
      skillNames.push(skillName);
    }
  }

  // Also try to extract from list items
  // Pattern: - skill-name or * skill-name
  const listRegex = /^[-*]\s+([a-zA-Z0-9_.-]+)$/gm;
  const listMatches = readme.matchAll(listRegex);

  for (const match of listMatches) {
    const skillName = match[1];
    if (skillName && !skillNames.includes(skillName)) {
      skillNames.push(skillName);
    }
  }

  return [...new Set(skillNames)];
}

/**
 * Recursively discover skills from repository
 */
async function autoDiscoverSkillsRecursively(
  org: string,
  repo: string,
  metadata: RepoMetadata,
  repoUrl: string,
): Promise<Recommendation[]> {
  const skills: Recommendation[] = [];

  // Try each skill directory pattern
  for (const skillDir of SKILL_DIR_PATTERNS) {
    console.log(`     → Trying directory: ${skillDir}`);

    // Strategy 1: Try GitHub API to list subdirectories
    let subdirs = await autoDiscoverSkills(org, repo, skillDir);

    // Strategy 2: If API failed, try to extract from README
    if (subdirs.length === 0) {
      console.log(`       → GitHub API returned no results, trying README fallback...`);
      subdirs = await extractSkillNamesFromReadme(org, repo, skillDir);
    }

    // Strategy 3: If README also failed, use known skills list
    if (subdirs.length === 0) {
      const repoKey = `${org}/${repo}`;
      const knownSkills = KNOWN_SKILLS_BY_REPO[repoKey];
      if (knownSkills && knownSkills.length > 0) {
        console.log(`       → Using known skills list (${knownSkills.length} skills)`);
        subdirs = knownSkills;
      }
    }

    if (subdirs.length === 0) {
      // Directory doesn't exist or is empty
      console.log(`       → No subdirectories found`);
      continue;
    }

    console.log(`       ✓ Found ${subdirs.length} subdirectories`);

    // Recursively explore each subdirectory
    for (const subdir of subdirs) {
      const subdirPath = `${skillDir}/${subdir}`;

      // Check if this is a skill directory (contains skill.md)
      const isSkill = await checkIfSkill(org, repo, subdirPath);

      if (isSkill) {
        // This is a direct skill
        const skill = await parseSkillFromRaw(org, repo, subdirPath, metadata, repoUrl);
        if (skill) {
          skills.push(skill);
        }
      } else {
        // This might be a subdirectory level (like .curated, experimental)
        // Try to explore one level deeper
        const subdirSkills = await exploreSubdirectory(org, repo, subdirPath, metadata, repoUrl);
        skills.push(...subdirSkills);
      }
    }

    // Found skills directory, no need to try other patterns
    if (skills.length > 0) {
      break;
    }
  }

  return skills;
}

/**
 * Explore a directory recursively
 * - If it contains skill.md → it's a skill
 * - If it contains subdirectories → explore them recursively
 */
/**
 * Explore a subdirectory one level deeper (for multi-level structures like OpenAI)
 */
async function exploreSubdirectory(
  org: string,
  repo: string,
  subdirPath: string,
  metadata: RepoMetadata,
  repoUrl: string,
): Promise<Recommendation[]> {
  const skills: Recommendation[] = [];

  // Try common skill numbering patterns (OpenAI uses numbers like 00, 01, 02...)
  for (let i = 0; i < 100; i++) {
    const skillPath = `${subdirPath}/${i.toString().padStart(2, "0")}`;
    const isSkill = await checkIfSkill(org, repo, skillPath);

    if (isSkill) {
      const skill = await parseSkillFromRaw(org, repo, skillPath, metadata, repoUrl);
      if (skill) {
        skills.push(skill);
      }
    } else if (i > 10 && skills.length === 0) {
      // If we've tried 10+ numbers and found nothing, stop
      break;
    }
  }

  return skills;
}

/**
 * Check if a directory contains a skill file
 */
async function checkIfSkill(org: string, repo: string, dirPath: string): Promise<boolean> {
  for (const pattern of SKILL_FILE_PATTERNS) {
    const fileUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/${dirPath}/${pattern}`;
    const content = await fetchRawFile(fileUrl);
    if (content) {
      return true; // Found skill file
    }
  }
  return false;
}
