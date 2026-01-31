/**
 * Official Skills Configuration
 *
 * Known official skill repositories from organizations
 */

export type OfficialSkillSource = {
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
};

/**
 * List of official skill sources
 * Priority: 100 = Official (Supabase, Anthropic, etc.)
 *           90-80 = Curated collections
 *           70-60 = Community maintained
 */
export const OFFICIAL_SKILL_SOURCES: OfficialSkillSource[] = [
  {
    name: "Anthropic Official Skills",
    org: "anthropics",
    repo: "skills",
    url: "https://github.com/anthropics/skills",
    priority: 100,
    description: "Official skills from Anthropic (DOCX, PDF, PPTX, XLSX)",
  },
  {
    name: "Supabase Agent Skills",
    org: "supabase",
    repo: "agent-skills",
    url: "https://github.com/supabase/agent-skills",
    priority: 100,
    description: "Official agent skills from Supabase",
  },
  {
    name: "VoltAgent Awesome Skills",
    org: "VoltAgent",
    repo: "awesome-agent-skills",
    url: "https://github.com/VoltAgent/awesome-agent-skills",
    priority: 90,
    description: "200+ agent skills from official dev teams and community",
  },
  {
    name: "Antigravity Awesome Skills",
    org: "sickn33",
    repo: "antigravity-awesome-skills",
    url: "https://github.com/sickn33/antigravity-awesome-skills",
    priority: 80,
    description: "500+ battle-tested skills including official from Anthropic and Vercel",
  },
  {
    name: "Nice Wolf Studio Supabase Skills",
    org: "Nice-Wolf-Studio",
    repo: "claude-code-supabase-skills",
    url: "https://github.com/Nice-Wolf-Studio/claude-code-supabase-skills",
    priority: 70,
    description: "Comprehensive Supabase API operations skills",
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
 */
export const SKILL_FILE_PATTERNS = ["skill.md", "SKILL.md", "README.md", "CLAUDE.md"];
