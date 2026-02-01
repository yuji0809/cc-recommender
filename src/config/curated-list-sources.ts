/**
 * Curated List Sources Configuration
 *
 * Repositories that contain curated lists of skill links (README-based discovery)
 */

export type CuratedListSource = {
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

  /** Path to README file (relative to repo root) */
  readmePath: string;
  /** Optional: Specific section in README to parse */
  readmeSection?: string;
};

/**
 * List of curated list sources
 * These repositories contain README files with links to other skill repositories
 */
export const CURATED_LIST_SOURCES: CuratedListSource[] = [
  // 1. VoltAgent Awesome Skills
  {
    name: "VoltAgent Awesome Skills",
    org: "VoltAgent",
    repo: "awesome-agent-skills",
    url: "https://github.com/VoltAgent/awesome-agent-skills",
    priority: 90,
    description: "200+ agent skills from official dev teams and community",
    readmePath: "README.md",
  },

  // 2. ComposioHQ Awesome Claude Skills
  {
    name: "ComposioHQ Awesome Claude Skills",
    org: "ComposioHQ",
    repo: "awesome-claude-skills",
    url: "https://github.com/ComposioHQ/awesome-claude-skills",
    priority: 90,
    description: "Curated collection of Claude skills",
    readmePath: "README.md",
  },
];
