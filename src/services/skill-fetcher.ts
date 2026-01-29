/**
 * Skill Fetcher
 *
 * Fetches skills, workflows, hooks, commands from awesome-claude-code
 * Source: https://github.com/hesreallyhim/awesome-claude-code
 */

import type { Recommendation } from "../types/domain-types.js";
import type { RawSkillEntry } from "../types/raw-types.js";

const CSV_URL =
  "https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/THE_RESOURCES_TABLE.csv";

/** Category to type mappings */
const CATEGORY_TO_TYPE: Record<string, Recommendation["type"]> = {
  "agent skills": "skill",
  skills: "skill",
  workflows: "workflow",
  "workflows & knowledge guides": "workflow",
  hooks: "hook",
  "slash-commands": "command",
  "slash commands": "command",
  commands: "command",
  tooling: "plugin",
  "ide integrations": "plugin",
  "usage monitors": "plugin",
  orchestrators: "plugin",
  "status lines": "plugin",
  "claude.md files": "skill",
  claudemd: "skill",
  "alternative clients": "plugin",
};

/**
 * Fetch skills from awesome-claude-code CSV
 */
export async function fetchSkills(): Promise<Recommendation[]> {
  console.log("🎯 Fetching skills from awesome-claude-code...");

  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    const entries = parseCSV(csvText);
    const recommendations = entries
      .map(transformSkillEntry)
      .filter((r): r is Recommendation => r !== null);

    console.log(`   ✓ Fetched ${recommendations.length} skills/workflows`);
    return recommendations;
  } catch (error) {
    console.error("   ✗ Failed to fetch skills:", error);
    return [];
  }
}

/**
 * Parse CSV to extract skill entries
 */
function parseCSV(csvText: string): RawSkillEntry[] {
  const lines = csvText.split("\n");
  if (lines.length < 2) return [];

  // Parse header
  const header = parseCSVLine(lines[0]);
  const nameIdx = findColumnIndex(header, ["name", "resource", "title"]);
  const urlIdx = findColumnIndex(header, ["url", "link", "github"]);
  const authorIdx = findColumnIndex(header, ["author", "creator", "by"]);
  const authorUrlIdx = findColumnIndex(header, ["author_url", "author url", "authorurl"]);
  const licenseIdx = findColumnIndex(header, ["license"]);
  const descIdx = findColumnIndex(header, ["description", "desc", "summary"]);
  const categoryIdx = findColumnIndex(header, ["category", "type", "section"]);

  const entries: RawSkillEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length < 2) continue;

    const entry: RawSkillEntry = {
      name: nameIdx >= 0 ? values[nameIdx]?.trim() || "" : "",
      url: urlIdx >= 0 ? values[urlIdx]?.trim() || "" : "",
      author: authorIdx >= 0 ? values[authorIdx]?.trim() || "" : "Unknown",
      authorUrl: authorUrlIdx >= 0 ? values[authorUrlIdx]?.trim() || "" : "",
      license: licenseIdx >= 0 ? values[licenseIdx]?.trim() : undefined,
      description: descIdx >= 0 ? values[descIdx]?.trim() || "" : "",
      category: categoryIdx >= 0 ? values[categoryIdx]?.trim() || "General" : "General",
    };

    // Skip entries without name or URL
    if (!entry.name || !entry.url) continue;

    entries.push(entry);
  }

  return entries;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Find column index by possible names
 */
function findColumnIndex(header: string[], possibleNames: string[]): number {
  const normalized = header.map((h) => h.toLowerCase().trim());
  for (const name of possibleNames) {
    const idx = normalized.indexOf(name.toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * Transform raw skill entry to unified Recommendation
 */
function transformSkillEntry(raw: RawSkillEntry): Recommendation | null {
  try {
    // Determine type from category
    const normalizedCategory = raw.category.toLowerCase();
    let type: Recommendation["type"] = "skill";

    for (const [cat, t] of Object.entries(CATEGORY_TO_TYPE)) {
      if (normalizedCategory.includes(cat)) {
        type = t;
        break;
      }
    }

    // Extract owner/repo from GitHub URL
    const repoMatch = raw.url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
    const _owner = repoMatch ? repoMatch[1] : raw.author;
    const _repo = repoMatch ? repoMatch[2].replace(/\.git$/, "") : raw.name;

    // Build detection rules
    const detection = buildDetectionRules(raw);

    // Build tags
    const tags: string[] = [raw.category.toLowerCase(), type];
    if (raw.license) {
      tags.push(raw.license.toLowerCase());
    }

    // Sanitize name for ID
    const sanitizedName = raw.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return {
      id: `skill-${sanitizedName}`,
      name: raw.name,
      type,
      url: raw.url,
      description: raw.description,
      author: {
        name: raw.author,
        url: raw.authorUrl || undefined,
      },
      category: raw.category,
      tags,
      detection,
      metrics: {
        source: "awesome-list",
        isOfficial: false,
      },
      install: {
        method: "manual",
        command: repoMatch ? `git clone ${raw.url}` : undefined,
      },
    };
  } catch {
    console.warn(`   ⚠ Failed to transform skill: ${raw.name}`);
    return null;
  }
}

/**
 * Build detection rules from skill entry
 */
function buildDetectionRules(raw: RawSkillEntry): Recommendation["detection"] {
  const rules: Recommendation["detection"] = {
    keywords: [],
  };

  // Extract keywords from name and description
  const text = `${raw.name} ${raw.description}`.toLowerCase();

  // Technology keywords
  const techKeywords = [
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
    "postgres",
    "mysql",
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
    "ai",
    "ml",
    "llm",
  ];

  for (const keyword of techKeywords) {
    if (text.includes(keyword)) {
      rules.keywords?.push(keyword);
    }
  }

  // Category-based rules
  const categoryRules = getCategoryRules(raw.category);
  if (categoryRules.keywords) {
    rules.keywords = [...(rules.keywords ?? []), ...categoryRules.keywords];
  }
  if (categoryRules.dependencies) {
    rules.dependencies = categoryRules.dependencies;
  }
  if (categoryRules.files) {
    rules.files = categoryRules.files;
  }
  if (categoryRules.frameworks) {
    rules.frameworks = categoryRules.frameworks;
  }

  // Deduplicate keywords
  rules.keywords = [...new Set(rules.keywords)];

  return rules;
}

/**
 * Get detection rules based on category
 */
function getCategoryRules(category: string): Partial<Recommendation["detection"]> {
  const normalized = category.toLowerCase();

  const mappings: Record<string, Partial<Recommendation["detection"]>> = {
    workflows: {
      keywords: ["workflow", "automation", "pipeline"],
      files: ["CLAUDE.md", ".claude/*"],
    },
    hooks: {
      keywords: ["hook", "git", "pre-commit", "post-commit"],
      files: [".claude/hooks/*", ".husky/*"],
    },
    "slash-commands": {
      keywords: ["command", "slash", "cli"],
      files: [".claude/commands/*"],
    },
    tooling: {
      keywords: ["tool", "utility", "helper"],
    },
    ide: {
      keywords: ["ide", "editor", "vscode", "vim", "emacs"],
    },
    orchestrators: {
      keywords: ["orchestration", "multi-agent", "swarm"],
    },
  };

  for (const [cat, rules] of Object.entries(mappings)) {
    if (normalized.includes(cat)) {
      return rules;
    }
  }

  return {};
}
