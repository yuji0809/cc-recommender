/**
 * MCP Server Fetcher
 *
 * Fetches MCP servers from awesome-mcp-servers repository
 * Source: https://github.com/punkpeye/awesome-mcp-servers
 */

import type { Recommendation } from "../types/domain-types.js";
import type { RawMCPEntry } from "../types/raw-types.js";

const README_URL = "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md";

/** Emoji to metadata mappings */
const EMOJI_MAPPINGS = {
  // Languages
  "🐍": { language: "python" },
  "📇": { language: "typescript" },
  "🏎️": { language: "go" },
  "🦀": { language: "rust" },
  "#️⃣": { language: "csharp" },
  "☕": { language: "java" },
  "🌊": { language: "cpp" },
  "💎": { language: "ruby" },
  // Scope
  "☁️": { scope: "cloud" as const },
  "🏠": { scope: "local" as const },
  // Platform
  "🍎": { platform: "macos" },
  "🪟": { platform: "windows" },
  "🐧": { platform: "linux" },
  "📟": { platform: "embedded" },
  // Official
  "🎖️": { isOfficial: true },
};

/** Category section headers */
const CATEGORY_HEADERS = [
  "Aggregators",
  "Art & Culture",
  "Architecture & Design",
  "Browser Automation",
  "Biology Medicine and Bioinformatics",
  "Cloud Platforms",
  "Code Execution",
  "Coding Agents",
  "Command Line",
  "Communication",
  "Customer Data Platforms",
  "Databases",
  "Data Platforms",
  "Developer Tools",
  "Data Science Tools",
  "File Systems",
  "Finance & Fintech",
  "Gaming",
  "Knowledge & Memory",
  "Location Services",
  "Marketing",
  "Monitoring",
  "Search",
  "Security",
  "Social Media",
  "Sports",
  "Text-to-Speech",
  "Travel & Transportation",
  "Version Control",
  "Workplace & Productivity",
  "Other Tools and Integrations",
];

/**
 * Fetch MCP servers from awesome-mcp-servers
 */
export async function fetchMCPServers(): Promise<Recommendation[]> {
  console.log("🔌 Fetching MCP servers from awesome-mcp-servers...");

  try {
    const response = await fetch(README_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const markdown = await response.text();
    const entries = parseMarkdown(markdown);
    const recommendations = entries
      .map(transformMCPEntry)
      .filter((r): r is Recommendation => r !== null);

    console.log(`   ✓ Fetched ${recommendations.length} MCP servers`);
    return recommendations;
  } catch (error) {
    console.error("   ✗ Failed to fetch MCP servers:", error);
    return [];
  }
}

/**
 * Parse markdown to extract MCP server entries
 */
function parseMarkdown(markdown: string): RawMCPEntry[] {
  const entries: RawMCPEntry[] = [];
  let currentCategory = "Uncategorized";

  const lines = markdown.split("\n");

  for (const line of lines) {
    // Check for category headers: ### 🔗 <a name="aggregators"></a>Aggregators
    const headerMatch = line.match(
      /^###?\s+(?:🔗|🎨|📐|📂|🧬|☁️|👨‍💻|🤖|🖥️|💬|👤|🗄️|📊|🚚|🛠️|🧮|📟|💰|🎮|🧠|🗺️|🎯|🔎|🔒|🌐|🏃|🎧|🌎|🚆|🔄|🏢|🚀)?\s*(?:<a[^>]*>)?(.+?)(?:<\/a>)?$/i,
    );
    if (headerMatch) {
      const potentialCategory = headerMatch[1].trim();
      if (CATEGORY_HEADERS.some((c) => potentialCategory.toLowerCase().includes(c.toLowerCase()))) {
        currentCategory = potentialCategory;
      }
      continue;
    }

    // Parse entry lines: - [owner/repo](url) emojis - description
    const entryMatch = line.match(/^[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*(.+)?$/);
    if (entryMatch) {
      const [, _nameOrPath, url, rest] = entryMatch;

      // Skip if not a GitHub URL (strict check to prevent URL spoofing)
      if (!url.match(/^https?:\/\/(www\.)?github\.com\//)) continue;

      // Parse owner/repo from URL or name
      const repoMatch = url.match(/github\.com\/([^/]+)\/([^/\s#]+)/);
      if (!repoMatch) continue;

      const [, owner, repo] = repoMatch;

      // Parse emojis and description
      const { metadata, description } = parseEmojisAndDescription(rest || "");

      entries.push({
        owner,
        repo: repo.replace(/\.git$/, ""),
        url,
        description,
        category: currentCategory,
        ...metadata,
      });
    }
  }

  return entries;
}

/**
 * Parse emojis and description from the rest of the line
 */
function parseEmojisAndDescription(text: string): {
  metadata: Partial<RawMCPEntry>;
  description: string;
} {
  const metadata: Partial<RawMCPEntry> = {
    platforms: [],
  };

  let remaining = text.trim();

  // Extract emojis from the beginning
  for (const [emoji, props] of Object.entries(EMOJI_MAPPINGS)) {
    if (remaining.includes(emoji)) {
      if ("language" in props) {
        metadata.language = props.language;
      }
      if ("scope" in props) {
        metadata.scope = props.scope;
      }
      if ("platform" in props) {
        metadata.platforms?.push(props.platform);
      }
      if ("isOfficial" in props) {
        metadata.isOfficial = props.isOfficial;
      }
      remaining = remaining.replace(emoji, "").trim();
    }
  }

  // Clean up platforms
  if (metadata.platforms?.length === 0) {
    delete metadata.platforms;
  }

  // Extract description (after " - ")
  const descMatch = remaining.match(/^-\s*(.+)$/);
  const description = descMatch ? descMatch[1].trim() : remaining;

  return { metadata, description };
}

/**
 * Transform raw MCP entry to unified Recommendation
 */
function transformMCPEntry(raw: RawMCPEntry): Recommendation | null {
  try {
    // Build detection rules
    const detection: Recommendation["detection"] = {
      keywords: [raw.category.toLowerCase()],
    };

    // Add language-specific detection
    if (raw.language) {
      detection.languages = [raw.language];
    }

    // Category-based detection enhancement
    const categoryKeywords = getCategoryKeywords(raw.category);
    if (categoryKeywords.length > 0) {
      detection.keywords = [...(detection.keywords ?? []), ...categoryKeywords];
    }

    const categoryDeps = getCategoryDependencies(raw.category);
    if (categoryDeps.length > 0) {
      detection.dependencies = categoryDeps;
    }

    // Build tags
    const tags: string[] = [raw.category.toLowerCase()];
    if (raw.language) tags.push(raw.language);
    if (raw.scope) tags.push(raw.scope);
    if (raw.platforms) tags.push(...raw.platforms);
    if (raw.isOfficial) tags.push("official");

    return {
      id: `mcp-${raw.owner}-${raw.repo}`,
      name: raw.repo,
      type: "mcp",
      url: raw.url,
      description: raw.description,
      author: {
        name: raw.owner,
        url: `https://github.com/${raw.owner}`,
      },
      category: raw.category,
      tags,
      detection,
      metrics: {
        source: raw.isOfficial ? "official" : "awesome-list",
        isOfficial: raw.isOfficial || false,
      },
      install: {
        method: "mcp-add",
        command: `claude mcp add ${raw.repo}`,
      },
    };
  } catch {
    console.warn(`   ⚠ Failed to transform MCP: ${raw.owner}/${raw.repo}`);
    return null;
  }
}

/**
 * Get keywords based on category
 */
function getCategoryKeywords(category: string): string[] {
  const mappings: Record<string, string[]> = {
    Databases: ["database", "sql", "nosql", "db", "query"],
    "Browser Automation": ["browser", "selenium", "playwright", "puppeteer", "scraping"],
    "Cloud Platforms": ["aws", "gcp", "azure", "cloud", "kubernetes", "docker"],
    Communication: ["slack", "discord", "email", "chat", "messaging"],
    "Developer Tools": ["git", "github", "ci", "cd", "devops"],
    "File Systems": ["file", "storage", "filesystem", "s3"],
    Security: ["security", "auth", "encryption", "vulnerability"],
    "Version Control": ["git", "github", "gitlab", "bitbucket"],
  };

  for (const [cat, keywords] of Object.entries(mappings)) {
    if (category.toLowerCase().includes(cat.toLowerCase())) {
      return keywords;
    }
  }

  return [];
}

/**
 * Get dependency hints based on category
 */
function getCategoryDependencies(category: string): string[] {
  const mappings: Record<string, string[]> = {
    Databases: ["prisma", "@prisma/client", "mongoose", "typeorm", "pg", "mysql2", "sqlite3"],
    "Browser Automation": ["playwright", "puppeteer", "selenium-webdriver"],
    Communication: ["@slack/web-api", "discord.js", "nodemailer"],
  };

  for (const [cat, deps] of Object.entries(mappings)) {
    if (category.toLowerCase().includes(cat.toLowerCase())) {
      return deps;
    }
  }

  return [];
}
