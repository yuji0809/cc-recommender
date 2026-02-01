/**
 * Curated List Fetcher
 *
 * Fetches skills from curated list repositories (README-based link extraction)
 * These repositories contain links to other skill repositories
 */

import {
  CURATED_LIST_SOURCES,
  type CuratedListSource,
} from "../../../config/curated-list-sources.js";
import type { Recommendation } from "../../../types/domain-types.js";
import { autoDiscoverSkills, fetchRawFile } from "./common/github-api.js";
import { fetchRepoMetadata, parseSkillFromRaw } from "./common/skill-parser.js";
import type { RepoMetadata } from "./common/types.js";

/**
 * Fetch skills from curated list repositories
 */
export async function fetchCuratedListSkills(): Promise<Recommendation[]> {
  console.log("📚 Fetching from curated lists (README-based discovery)...");

  const allSkills: Recommendation[] = [];

  for (const source of CURATED_LIST_SOURCES) {
    try {
      console.log(`   → ${source.name} (${source.org}/${source.repo}) [README parsing]`);
      const skills = await fetchSkillsFromCuratedList(source);
      allSkills.push(...skills);
      console.log(`     ✓ Found ${skills.length} skills`);
    } catch (error) {
      console.warn(`     ⚠ Failed to fetch from ${source.name}:`, error);
    }
  }

  console.log(`   ✓ Total skills from curated lists: ${allSkills.length}`);
  return allSkills;
}

/**
 * Fetch skills from a curated list repository
 */
async function fetchSkillsFromCuratedList(source: CuratedListSource): Promise<Recommendation[]> {
  const { org, repo, url, readmePath, readmeSection } = source;

  // Get repository metadata
  const metadata = await fetchRepoMetadata(org, repo, url);

  // Fetch skills from README
  const skills = await fetchSkillsFromReadme(org, repo, readmePath, readmeSection, metadata, url);

  return skills;
}

/**
 * Fetch skills from README file (link extraction mode)
 */
async function fetchSkillsFromReadme(
  org: string,
  repo: string,
  readmePath: string,
  section: string | undefined,
  metadata: RepoMetadata,
  _repoUrl: string,
): Promise<Recommendation[]> {
  const skills: Recommendation[] = [];

  // Fetch README
  const readmeUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/${readmePath}`;
  const readmeContent = await fetchRawFile(readmeUrl);

  if (!readmeContent) {
    console.log(`     ℹ README not found at ${readmePath}`);
    return skills;
  }

  // Extract skill links from README
  const skillLinks = extractSkillLinksFromReadme(readmeContent, section);

  console.log(`     ✓ Found ${skillLinks.length} skill repository links in README`);

  // Parse all links to extract org/repo
  const repositories = skillLinks
    .map((link) => {
      const repoMatch = link.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (repoMatch) {
        const [, linkOrg, linkRepo] = repoMatch;
        // Clean repo name (remove .git, query params, etc.)
        const cleanRepo = linkRepo.replace(/\.git$/, "").split(/[?#]/)[0];
        return { org: linkOrg, repo: cleanRepo, url: link };
      }
      return null;
    })
    .filter((r): r is { org: string; repo: string; url: string } => r !== null);

  console.log(`     → Validating ${repositories.length} repositories...`);

  // Process repositories in batches (parallel processing with rate limiting)
  const BATCH_SIZE = 10; // Process 10 repos at a time to avoid overwhelming the API
  const validatedRepos: Array<{ org: string; repo: string; url: string; isValid: boolean }> = [];

  for (let i = 0; i < repositories.length; i += BATCH_SIZE) {
    const batch = repositories.slice(i, i + BATCH_SIZE);

    // Validate batch in parallel
    const validationResults = await Promise.all(
      batch.map(async ({ org, repo, url }) => {
        const isValid = await validateSkillRepository(org, repo);
        return { org, repo, url, isValid };
      }),
    );

    validatedRepos.push(...validationResults);

    // Progress indicator
    const processed = Math.min(i + BATCH_SIZE, repositories.length);
    if (processed % 50 === 0 || processed === repositories.length) {
      const validCount = validatedRepos.filter((r) => r.isValid).length;
      console.log(
        `       → Validated ${processed}/${repositories.length} repositories (${validCount} valid)`,
      );
    }
  }

  // Filter to only valid skill repositories
  const validRepos = validatedRepos.filter((r) => r.isValid);
  console.log(`     ✓ Found ${validRepos.length} valid skill repositories`);

  // Fetch skills from valid repositories in parallel
  const skillPromises = validRepos.map(async ({ org, repo, url }) => {
    try {
      const foundSkills = await fetchExternalSkill(org, repo, url, metadata);
      return foundSkills;
    } catch {
      return [];
    }
  });

  const skillsArrays = await Promise.all(skillPromises);
  skills.push(...skillsArrays.flat());

  console.log(`     ✓ Fetched ${skills.length} skills from ${validRepos.length} repositories`);

  return skills;
}

/**
 * Fetch a skill from an external GitHub repository
 */
/**
 * Curated list repositories that should not be detected as skills
 * These repositories contain links to skills, but are not skills themselves
 */
const CURATED_LIST_REPOS = ["VoltAgent/awesome-agent-skills", "ComposioHQ/awesome-claude-skills"];

/**
 * Check if a repository is a curated list repository
 */
function isCuratedListRepo(org: string, repo: string): boolean {
  const repoKey = `${org}/${repo}`;
  return CURATED_LIST_REPOS.includes(repoKey);
}

/**
 * Validate if a repository contains skills
 * Checks for skills directory or skill.md file
 */
async function validateSkillRepository(org: string, repo: string): Promise<boolean> {
  // Exclude curated list repositories
  if (isCuratedListRepo(org, repo)) {
    return false;
  }

  // Strategy 1: Check for common skills directories
  const skillDirPatterns = ["skills", ".claude/skills"];
  const skillFilePatterns = ["skill.md", "SKILL.md", "README.md"];

  // Check if any skill directory exists
  for (const dirPattern of skillDirPatterns) {
    const dirUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/${dirPattern}/README.md`;
    const dirContent = await fetchRawFile(dirUrl);
    if (dirContent) {
      return true; // Found skills directory
    }
  }

  // Strategy 2: Check if root contains skill.md (single skill repo)
  for (const filePattern of skillFilePatterns) {
    const fileUrl = `https://raw.githubusercontent.com/${org}/${repo}/main/${filePattern}`;
    const fileContent = await fetchRawFile(fileUrl);
    if (fileContent?.toLowerCase().includes("skill")) {
      return true; // Found skill file
    }
  }

  return false; // Not a skill repository
}

async function fetchExternalSkill(
  org: string,
  repo: string,
  url: string,
  _parentMetadata: RepoMetadata,
): Promise<Recommendation[]> {
  try {
    const skills: Recommendation[] = [];

    // Strategy 1: Try as skill collection (check for .claude/skills or skills directory)
    const collectionPaths = [".claude/skills", "skills"];

    for (const skillsDir of collectionPaths) {
      // Try to auto-discover skills in this directory
      const discoveredSkills = await autoDiscoverSkills(org, repo, skillsDir);

      if (discoveredSkills.length > 0) {
        // This is a skill collection! Fetch each skill
        console.log(
          `       → Found skill collection in ${org}/${repo}/${skillsDir} (${discoveredSkills.length} skills)`,
        );

        for (const skillName of discoveredSkills) {
          try {
            const skillPath = `${skillsDir}/${skillName}`;
            const skill = await parseSkillFromRaw(
              org,
              repo,
              skillPath,
              {
                name: repo,
                description: `Skills from ${org}/${repo}`,
                stars: 0,
                url,
                owner: org,
                ownerUrl: `https://github.com/${org}`,
                topics: [],
              },
              url,
            );

            if (skill) {
              skills.push(skill);
            }
          } catch {
            // Skill file doesn't exist, skip
          }
        }

        return skills; // Found collection, return all skills
      }
    }

    // Strategy 2: Try as single skill repository
    // Check if repo itself has skill files (not in subdirectory)
    const singleSkillPaths = ["skill", "."]; // Try "skill" subdirectory or root

    for (const basePath of singleSkillPaths) {
      const skill = await parseSkillFromRaw(
        org,
        repo,
        basePath,
        {
          name: repo,
          description: `Skill from ${org}/${repo}`,
          stars: 0,
          url,
          owner: org,
          ownerUrl: `https://github.com/${org}`,
          topics: [],
        },
        url,
      );

      if (skill) {
        console.log(
          `       → Found single skill in ${org}/${repo}${basePath !== "." ? `/${basePath}` : ""}`,
        );
        return [skill];
      }
    }

    // Neither collection nor single skill found
    // This is expected for repos that aren't skill repositories
    return [];
  } catch {
    return [];
  }
}

/**
 * Extract skill links from README content
 * Supports both full GitHub URLs and relative paths
 */
function extractSkillLinksFromReadme(content: string, section?: string): string[] {
  let contentToParse = content;

  // If section specified, extract only that section
  if (section) {
    const sectionRegex = new RegExp(`##\\s+${section}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, "i");
    const match = content.match(sectionRegex);
    if (match?.[1]) {
      contentToParse = match[1];
    }
  }

  const links: string[] = [];

  // Pattern 1: Full GitHub URLs
  const githubUrlRegex = /\[([^\]]+)\]\((https:\/\/github\.com\/[^)]+)\)/g;
  const urlMatches = contentToParse.matchAll(githubUrlRegex);
  for (const match of urlMatches) {
    if (match[2]) {
      links.push(match[2]);
    }
  }

  // Pattern 2: Relative paths to skills (less common for curated lists)
  const relativeRegex = /\[([^\]]+)\]\((\.\/[^)]*skills[^)]+)\)/g;
  const relativeMatches = contentToParse.matchAll(relativeRegex);
  for (const match of relativeMatches) {
    if (match[2]) {
      // Convert relative path to full URL (would need org/repo context)
      // For now, skip relative paths in README parsing mode
      // as they're typically used for in-repo skill directories
    }
  }

  return [...new Set(links)];
}
