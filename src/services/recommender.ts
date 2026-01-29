/**
 * Recommender Service
 * 
 * Calculates match scores and generates recommendations
 */

import type { 
  Recommendation, 
  ScoredRecommendation, 
  ProjectInfo,
  RecommendationDatabase 
} from "../types/index.js";

/** Score weights for different match types */
const WEIGHTS = {
  language: 5,      // Language match is very important
  framework: 4,     // Framework match is important
  dependency: 3,    // Direct dependency match
  file: 2,          // File pattern match
  keyword: 1,       // Keyword/tag match
};

/** Score multipliers */
const MULTIPLIERS = {
  official: 1.3,        // Official items get a boost
  highSecurity: 1.1,    // Security score > 80
  lowSecurity: 0.7,     // Security score < 50
};

/**
 * Generate recommendations based on project analysis
 */
export function recommend(
  database: RecommendationDatabase,
  project: ProjectInfo,
  userQuery?: string,
  options: RecommendOptions = {}
): ScoredRecommendation[] {
  const {
    maxResults = 20,
    minScore = 1,
    types,
  } = options;
  
  const results: ScoredRecommendation[] = [];
  
  for (const item of database.items) {
    // Filter by type if specified
    if (types && !types.includes(item.type)) {
      continue;
    }
    
    const { score, reasons } = calculateScore(item, project, userQuery);
    
    if (score >= minScore) {
      results.push({ item, score, reasons });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  // Return top results
  return results.slice(0, maxResults);
}

/**
 * Calculate match score for a single item
 */
export function calculateScore(
  item: Recommendation,
  project: ProjectInfo,
  userQuery?: string
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  
  const detection = item.detection;
  
  // 1. Language match
  if (detection.languages && detection.languages.length > 0) {
    const matches = detection.languages.filter(
      lang => project.languages.includes(lang.toLowerCase())
    );
    if (matches.length > 0) {
      score += matches.length * WEIGHTS.language;
      reasons.push(`言語: ${matches.join(", ")}`);
    }
  }
  
  // 2. Framework match
  if (detection.frameworks && detection.frameworks.length > 0) {
    const matches = detection.frameworks.filter(
      fw => project.frameworks.includes(fw.toLowerCase())
    );
    if (matches.length > 0) {
      score += matches.length * WEIGHTS.framework;
      reasons.push(`フレームワーク: ${matches.join(", ")}`);
    }
  }
  
  // 3. Dependency match
  if (detection.dependencies && detection.dependencies.length > 0) {
    const projectDepsLower = project.dependencies.map(d => d.toLowerCase());
    const matches = detection.dependencies.filter(
      dep => projectDepsLower.includes(dep.toLowerCase())
    );
    if (matches.length > 0) {
      score += matches.length * WEIGHTS.dependency;
      reasons.push(`依存関係: ${matches.join(", ")}`);
    }
  }
  
  // 4. File pattern match
  if (detection.files && detection.files.length > 0) {
    const matches = detection.files.filter(pattern => 
      project.files.some(file => matchGlob(file, pattern))
    );
    if (matches.length > 0) {
      score += matches.length * WEIGHTS.file;
      reasons.push(`ファイル: ${matches.join(", ")}`);
    }
  }
  
  // 5. Keyword match (from user query)
  if (userQuery) {
    const queryLower = userQuery.toLowerCase();
    const keywords = detection.keywords || [];
    const tagMatches = [...keywords, ...item.tags].filter(
      kw => queryLower.includes(kw.toLowerCase())
    );
    if (tagMatches.length > 0) {
      score += tagMatches.length * WEIGHTS.keyword;
      reasons.push(`キーワード: ${[...new Set(tagMatches)].join(", ")}`);
    }
    
    // Also check name and description
    if (queryLower.includes(item.name.toLowerCase())) {
      score += WEIGHTS.keyword * 2;
      reasons.push(`名前一致: ${item.name}`);
    }
  }
  
  // 6. Apply multipliers
  if (item.metrics.isOfficial) {
    score *= MULTIPLIERS.official;
    if (reasons.length > 0) {
      reasons.push("公式");
    }
  }
  
  if (item.metrics.securityScore !== undefined) {
    if (item.metrics.securityScore >= 80) {
      score *= MULTIPLIERS.highSecurity;
    } else if (item.metrics.securityScore < 50) {
      score *= MULTIPLIERS.lowSecurity;
    }
  }
  
  return { score: Math.round(score * 100) / 100, reasons };
}

/**
 * Simple glob pattern matching
 */
function matchGlob(filepath: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*")
    .replace(/\?/g, ".");
  
  const regex = new RegExp(`^${regexPattern}$`, "i");
  return regex.test(filepath);
}

/**
 * Group recommendations by type
 */
export function groupByType(
  recommendations: ScoredRecommendation[]
): Map<Recommendation["type"], ScoredRecommendation[]> {
  const groups = new Map<Recommendation["type"], ScoredRecommendation[]>();
  
  for (const rec of recommendations) {
    const type = rec.item.type;
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)!.push(rec);
  }
  
  return groups;
}

/**
 * Format recommendations for display
 */
export function formatRecommendations(
  recommendations: ScoredRecommendation[]
): string {
  if (recommendations.length === 0) {
    return "プロジェクトに適した推薦が見つかりませんでした。";
  }
  
  const grouped = groupByType(recommendations);
  const lines: string[] = [];
  
  // Type labels
  const typeLabels: Record<Recommendation["type"], string> = {
    plugin: "📦 プラグイン",
    mcp: "🔌 MCPサーバー",
    skill: "🎯 スキル",
    workflow: "🔄 ワークフロー",
    hook: "🪝 フック",
    command: "⚡ コマンド",
    agent: "🤖 エージェント",
  };
  
  // Order of types to display
  const typeOrder: Recommendation["type"][] = [
    "plugin", "mcp", "skill", "workflow", "hook", "command", "agent"
  ];
  
  for (const type of typeOrder) {
    const items = grouped.get(type);
    if (!items || items.length === 0) continue;
    
    lines.push(`\n${typeLabels[type]}`);
    lines.push("━".repeat(40));
    
    for (let i = 0; i < Math.min(items.length, 5); i++) {
      const { item, score, reasons } = items[i];
      
      lines.push(`${i + 1}. ${item.name}${item.metrics.isOfficial ? " (公式)" : ""}`);
      lines.push(`   ├─ 用途: ${item.description.slice(0, 60)}${item.description.length > 60 ? "..." : ""}`);
      lines.push(`   ├─ スコア: ${score}${getScoreIndicator(score)}`);
      
      if (reasons.length > 0) {
        lines.push(`   ├─ 推薦理由: ${reasons.join(", ")}`);
      }
      
      if (item.install.command) {
        lines.push(`   └─ インストール: ${item.install.command}`);
      } else {
        lines.push(`   └─ URL: ${item.url}`);
      }
      
      lines.push("");
    }
    
    if (items.length > 5) {
      lines.push(`   ... 他 ${items.length - 5} 件`);
    }
  }
  
  return lines.join("\n");
}

/**
 * Get score indicator emoji
 */
function getScoreIndicator(score: number): string {
  if (score >= 10) return " ✅ 高適合";
  if (score >= 5) return " 👍 適合";
  if (score >= 2) return " 📝 参考";
  return "";
}

/** Options for recommend function */
export interface RecommendOptions {
  /** Maximum number of results */
  maxResults?: number;
  /** Minimum score threshold */
  minScore?: number;
  /** Filter by types */
  types?: Recommendation["type"][];
}

/**
 * Search recommendations by query
 */
export function search(
  database: RecommendationDatabase,
  query: string,
  options: SearchOptions = {}
): ScoredRecommendation[] {
  const {
    maxResults = 20,
    types,
  } = options;
  
  const queryLower = query.toLowerCase();
  const results: ScoredRecommendation[] = [];
  
  for (const item of database.items) {
    // Filter by type if specified
    if (types && !types.includes(item.type)) {
      continue;
    }
    
    let score = 0;
    const reasons: string[] = [];
    
    // Name match
    if (item.name.toLowerCase().includes(queryLower)) {
      score += 10;
      reasons.push("名前一致");
    }
    
    // Description match
    if (item.description.toLowerCase().includes(queryLower)) {
      score += 5;
      reasons.push("説明一致");
    }
    
    // Category match
    if (item.category.toLowerCase().includes(queryLower)) {
      score += 3;
      reasons.push("カテゴリ一致");
    }
    
    // Tag match
    const tagMatch = item.tags.find(t => t.toLowerCase().includes(queryLower));
    if (tagMatch) {
      score += 2;
      reasons.push(`タグ: ${tagMatch}`);
    }
    
    // Official boost
    if (item.metrics.isOfficial) {
      score *= 1.2;
    }
    
    if (score > 0) {
      results.push({ item, score, reasons });
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}

/** Options for search function */
export interface SearchOptions {
  /** Maximum number of results */
  maxResults?: number;
  /** Filter by types */
  types?: Recommendation["type"][];
}
