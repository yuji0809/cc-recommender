/**
 * Direct Skill Sources Configuration
 *
 * Repositories that directly contain skills (either as collections or single skills)
 */

export type DirectSkillSource = {
  /** Display name */
  name: string;
  /** GitHub organization */
  org: string;
  /** Repository name */
  repo: string;
  /** Full GitHub URL */
  url: string;
  /** Priority (higher = more important) */
  priority: number;
  /** Optional description */
  description?: string;
  // それだけ！取得方法は自動判定
};

/**
 * List of direct skill sources
 * These repositories directly contain skills, either as:
 * - Skill collections (multiple skills in subdirectories)
 * - Single skill repositories (entire repo is one skill)
 */
export const DIRECT_SKILL_SOURCES: DirectSkillSource[] = [
  // 1. Vercel Labs Agent Skills
  {
    name: "Vercel Labs Agent Skills",
    org: "vercel-labs",
    repo: "agent-skills",
    url: "https://github.com/vercel-labs/agent-skills",
    priority: 100,
    description: "Official agent skills from Vercel",
  },

  // 2. Anthropic Official Skills
  {
    name: "Anthropic Official Skills",
    org: "anthropics",
    repo: "skills",
    url: "https://github.com/anthropics/skills",
    priority: 100,
    description: "Official skills from Anthropic",
  },

  // 3. OpenAI Skills
  {
    name: "OpenAI Skills",
    org: "openai",
    repo: "skills",
    url: "https://github.com/openai/skills",
    priority: 100,
    description: "Official skills from OpenAI",
  },

  // 4. Obra Superpowers
  {
    name: "Obra Superpowers",
    org: "obra",
    repo: "superpowers",
    url: "https://github.com/obra/superpowers",
    priority: 80,
    description: "Community-maintained skills collection",
  },

  // 5. Supabase Postgres Best Practices
  {
    name: "Supabase Postgres Best Practices",
    org: "supabase",
    repo: "agent-skills",
    url: "https://github.com/supabase/agent-skills",
    priority: 100,
    description: "Supabase Postgres best practices skill",
  },

  // 6. Playwright Skill
  {
    name: "Playwright Skill",
    org: "lackeyjb",
    repo: "playwright-skill",
    url: "https://github.com/lackeyjb/playwright-skill",
    priority: 80,
    description: "Playwright testing skill for Claude",
  },
];

/**
 * Skill directory patterns to search in repositories
 */
export const SKILL_DIRECTORY_PATTERNS = [
  ".claude/skills",
  "skills",
  "agent-skills",
  "claude-skills",
];

/**
 * Skill file patterns
 * SKILL.md (uppercase) is prioritized as it's used by OpenAI and Obra
 */
export const SKILL_FILE_PATTERNS = ["SKILL.md", "skill.md", "README.md", "CLAUDE.md"];
