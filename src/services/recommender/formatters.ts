/**
 * Recommendation Formatters
 *
 * Formats recommendation results for display
 */

import type { Recommendation } from "../../types/domain-types.js";
import type { ScoredRecommendation } from "../../types/service-types.js";
import { getSecurityBadge } from "../security-scanner.service.js";
import { getScoreIndicator } from "./scoring/scorer.js";

/**
 * Get score explanation
 *
 * @param score - The calculated score (1-100)
 * @returns Brief explanation of the score
 */
function getScoreExplanation(score: number): string {
  if (score >= 80) return "プロジェクトに強く推薦";
  if (score >= 50) return "プロジェクトに適合";
  if (score >= 20) return "参考として有用";
  return "低い適合度";
}

/**
 * Get installation instructions for an item
 *
 * @param item - The recommendation item
 * @returns Installation instructions
 */
function getInstallInstructions(item: Recommendation): string[] {
  const lines: string[] = [];

  // Plugin - use install command
  if (item.type === "plugin") {
    if (item.install.command) {
      lines.push(`   └─ インストール: ${item.install.command}`);
    } else {
      lines.push(`   └─ URL: ${item.url}`);
    }
    return lines;
  }

  // MCP Server - use install command or URL
  if (item.type === "mcp") {
    if (item.install.command) {
      lines.push(`   ├─ インストール: ${item.install.command}`);
      lines.push(`   └─ 設定を ~/.claude/claude_desktop_config.json に追加してください`);
    } else {
      lines.push(`   └─ URL: ${item.url}`);
    }
    return lines;
  }

  // Skill/Workflow/Hook/Command/Agent - manual installation with detailed steps
  const typePathMap: Record<string, string> = {
    skill: ".claude/skills/",
    workflow: ".claude/workflows/",
    hook: ".claude/hooks/",
    command: ".claude/commands/",
    agent: ".claude/agents/",
  };

  const targetPath = typePathMap[item.type] || ".claude/";

  lines.push(`   ├─ インストール手順:`);
  lines.push(`   │  1. 以下のURLからファイルをダウンロード:`);
  lines.push(`   │     ${item.url}`);
  lines.push(`   │  2. プロジェクトの ${targetPath} に配置`);
  lines.push(`   └─ 詳細: ${item.url}`);

  return lines;
}

/**
 * Group recommendations by type
 *
 * @param recommendations - List of scored recommendations
 * @returns Map of type to recommendations
 */
export function groupByType(
  recommendations: ScoredRecommendation[],
): Map<Recommendation["type"], ScoredRecommendation[]> {
  const groups = new Map<Recommendation["type"], ScoredRecommendation[]>();

  for (const rec of recommendations) {
    const type = rec.item.type;
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type)?.push(rec);
  }

  return groups;
}

/**
 * Select bonus recommendations (popular/trending items)
 *
 * @param recommendations - List of all recommendations
 * @param displayedIds - Set of IDs already displayed
 * @returns 1-2 bonus recommendations
 */
function selectBonusRecommendations(
  recommendations: ScoredRecommendation[],
  displayedIds: Set<string>,
): ScoredRecommendation[] {
  // Filter out already displayed items
  const candidates = recommendations.filter((rec) => !displayedIds.has(rec.item.id));

  if (candidates.length === 0) return [];

  // Score each candidate for "bonus worthiness"
  const scored = candidates.map((rec) => {
    let bonusScore = 0;

    // Official items get priority
    if (rec.item.metrics.isOfficial) bonusScore += 100;

    // High star count indicates popularity
    if (rec.item.metrics.stars) {
      bonusScore += Math.min(rec.item.metrics.stars / 10, 50); // Cap at 50 points
    }

    // High security score indicates quality
    if (rec.item.metrics.securityScore && rec.item.metrics.securityScore >= 80) {
      bonusScore += 30;
    }

    // Recently updated items (within last 6 months)
    if (rec.item.metrics.lastUpdated) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const lastUpdated = new Date(rec.item.metrics.lastUpdated);
      if (lastUpdated > sixMonthsAgo) {
        bonusScore += 20;
      }
    }

    return { rec, bonusScore };
  });

  // Sort by bonus score
  scored.sort((a, b) => b.bonusScore - a.bonusScore);

  // Return top 1-2 items
  return scored.slice(0, 2).map((s) => s.rec);
}

/**
 * Get bonus recommendation label
 *
 * @param item - The recommendation item
 * @returns Label explaining why it's recommended
 */
function getBonusLabel(item: Recommendation): string {
  if (item.metrics.isOfficial) return "公式推奨";
  if (item.metrics.stars && item.metrics.stars >= 100) return "人気のツール";
  if (item.metrics.securityScore && item.metrics.securityScore >= 80) return "高品質";

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  if (item.metrics.lastUpdated && new Date(item.metrics.lastUpdated) > sixMonthsAgo) {
    return "最近話題";
  }

  return "おすすめ";
}

/**
 * Format recommendations for display
 *
 * @param recommendations - List of scored recommendations
 * @param allRecommendations - All available recommendations for bonus section
 * @returns Formatted string for display
 */
export function formatRecommendations(
  recommendations: ScoredRecommendation[],
  allRecommendations?: ScoredRecommendation[],
): string {
  if (recommendations.length === 0) {
    return "プロジェクトに適した推薦が見つかりませんでした。";
  }

  const grouped = groupByType(recommendations);
  const lines: string[] = [];

  // Type labels with descriptions
  const typeLabels: Record<Recommendation["type"], string> = {
    plugin: "📦 プラグイン (Claude Codeの拡張機能)",
    mcp: "🔌 MCPサーバー (外部サービス連携)",
    skill: "🎯 スキル (再利用可能な指示セット)",
    workflow: "🔄 ワークフロー (複数ステップの自動化)",
    hook: "🪝 フック (イベント駆動の処理)",
    command: "⚡ コマンド (カスタムコマンド)",
    agent: "🤖 エージェント (専門タスク実行)",
  };

  // Order of types to display
  const typeOrder: Recommendation["type"][] = [
    "plugin",
    "mcp",
    "skill",
    "workflow",
    "hook",
    "command",
    "agent",
  ];

  // Track displayed IDs
  const displayedIds = new Set<string>();

  for (const type of typeOrder) {
    const items = grouped.get(type);
    if (!items || items.length === 0) continue;

    // Section header with count
    const displayCount = Math.min(items.length, 5);
    lines.push(`\n${typeLabels[type]} (${displayCount}件のおすすめ)`);
    lines.push("━".repeat(40));

    for (let i = 0; i < displayCount; i++) {
      const { item, score, reasons } = items[i];
      displayedIds.add(item.id);

      // Item name with official badge
      const officialBadge = item.metrics.isOfficial ? " ✨ (公式)" : "";
      lines.push(`\n${i + 1}. ${item.name}${officialBadge}`);

      // Description
      lines.push(
        `   ├─ 用途: ${item.description.slice(0, 60)}${item.description.length > 60 ? "..." : ""}`,
      );

      // Score with explanation
      const scoreExplanation = getScoreExplanation(score);
      lines.push(`   ├─ スコア: ${score}${getScoreIndicator(score)} - ${scoreExplanation}`);

      // Security score (if available)
      if (item.metrics.securityScore !== undefined) {
        const securityBadge = getSecurityBadge(item.metrics.securityScore);
        lines.push(`   ├─ セキュリティ: ${securityBadge} (${item.metrics.securityScore}/100)`);
      }

      // Match reasons
      if (reasons.length > 0) {
        lines.push(`   ├─ マッチ内容: ${reasons.join(", ")}`);
      }

      // Installation instructions
      const installLines = getInstallInstructions(item);
      lines.push(...installLines);
    }

    if (items.length > 5) {
      lines.push(`\n   💡 他に ${items.length - 5} 件の候補があります`);
    }

    lines.push("");
  }

  // Add bonus recommendations section
  if (allRecommendations && allRecommendations.length > 0) {
    const bonusItems = selectBonusRecommendations(allRecommendations, displayedIds);

    if (bonusItems.length > 0) {
      lines.push("\n🔥 人気・トレンド (話題のツール)");
      lines.push("━".repeat(40));

      for (let i = 0; i < bonusItems.length; i++) {
        const { item } = bonusItems[i];
        const bonusLabel = getBonusLabel(item);

        lines.push(`\n${i + 1}. ${item.name} (${bonusLabel})`);
        lines.push(
          `   ├─ 用途: ${item.description.slice(0, 60)}${item.description.length > 60 ? "..." : ""}`,
        );

        if (item.metrics.stars) {
          lines.push(`   ├─ GitHub Stars: ⭐ ${item.metrics.stars}`);
        }

        // Installation instructions
        const installLines = getInstallInstructions(item);
        lines.push(...installLines);
      }
    }
  }

  return lines.join("\n");
}
