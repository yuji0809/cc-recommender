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
 * Format recommendations for display
 *
 * @param recommendations - List of scored recommendations
 * @returns Formatted string for display
 */
export function formatRecommendations(recommendations: ScoredRecommendation[]): string {
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
    "plugin",
    "mcp",
    "skill",
    "workflow",
    "hook",
    "command",
    "agent",
  ];

  for (const type of typeOrder) {
    const items = grouped.get(type);
    if (!items || items.length === 0) continue;

    lines.push(`\n${typeLabels[type]}`);
    lines.push("━".repeat(40));

    for (let i = 0; i < Math.min(items.length, 5); i++) {
      const { item, score, reasons } = items[i];

      lines.push(`${i + 1}. ${item.name}${item.metrics.isOfficial ? " (公式)" : ""}`);
      lines.push(
        `   ├─ 用途: ${item.description.slice(0, 60)}${item.description.length > 60 ? "..." : ""}`,
      );
      lines.push(`   ├─ スコア: ${score}${getScoreIndicator(score)}`);

      // セキュリティスコア表示
      if (item.metrics.securityScore !== undefined) {
        const securityBadge = getSecurityBadge(item.metrics.securityScore);
        lines.push(`   ├─ セキュリティ: ${securityBadge} (${item.metrics.securityScore}/100)`);
      }

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
