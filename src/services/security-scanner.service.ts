/**
 * Security Scanner Service
 *
 * Scans GitHub repositories using cc-audit for security vulnerabilities
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/** cc-audit スキャン結果 */
export type SecurityScanResult = {
  /** セキュリティスコア (0-100, 100が最も安全) */
  score: number;
  /** 検出された脆弱性の数 */
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  /** スキャン成功フラグ */
  success: boolean;
  /** エラーメッセージ（スキャン失敗時） */
  error?: string;
};

/**
 * GitHubリポジトリをcc-auditでスキャン
 *
 * @param repoUrl - GitHubリポジトリURL
 * @param scanType - スキャンタイプ (mcp, skill, plugin)
 * @returns スキャン結果
 */
export async function scanRepository(
  repoUrl: string,
  scanType: "mcp" | "skill" | "plugin" = "mcp",
): Promise<SecurityScanResult> {
  try {
    // cc-audit を --remote モードで実行
    // --config で現在のプロジェクトの設定ファイルを使用
    const configPath = `${process.cwd()}/.cc-audit.yaml`;
    const command = `npx -y @cc-audit/cc-audit check --remote ${repoUrl} --type ${scanType} --config ${configPath} --format json --ci`;

    const { stdout } = await execAsync(command, {
      timeout: 30000, // 30秒タイムアウト
    });

    // JSON出力をパース
    const result = JSON.parse(stdout);

    // スコア計算: 100点満点から減点方式
    // critical: -25点, high: -10点, medium: -5点, low: -2点
    const findings = {
      critical: result.summary?.critical || 0,
      high: result.summary?.high || 0,
      medium: result.summary?.medium || 0,
      low: result.summary?.low || 0,
    };

    const deduction =
      findings.critical * 25 + findings.high * 10 + findings.medium * 5 + findings.low * 2;

    const score = Math.max(0, 100 - deduction);

    return {
      score,
      findings,
      success: true,
    };
  } catch (error) {
    console.error(`Security scan failed for ${repoUrl}:`, error);

    // スキャン失敗時は最低スコア
    return {
      score: 0,
      findings: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 複数のリポジトリを並列スキャン
 *
 * @param repos - スキャン対象のリポジトリ情報
 * @param concurrency - 並列実行数（デフォルト: 3）
 * @returns スキャン結果のマップ
 */
export async function scanRepositories(
  repos: Array<{ url: string; type: "mcp" | "skill" | "plugin" }>,
  concurrency = 3,
): Promise<Map<string, SecurityScanResult>> {
  const results = new Map<string, SecurityScanResult>();

  // 並列実行数を制限しながらスキャン
  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (repo) => ({
        url: repo.url,
        result: await scanRepository(repo.url, repo.type),
      })),
    );

    for (const { url, result } of batchResults) {
      results.set(url, result);
    }

    // 進捗表示
    console.error(
      `Scanned ${Math.min(i + concurrency, repos.length)}/${repos.length} repositories`,
    );
  }

  return results;
}

/**
 * セキュリティスコアのバッジテキストを生成
 *
 * @param score - セキュリティスコア (0-100)
 * @returns バッジテキスト
 */
export function getSecurityBadge(score: number): string {
  if (score >= 90) return "🟢 Excellent";
  if (score >= 70) return "🟡 Good";
  if (score >= 50) return "🟠 Fair";
  return "🔴 Poor";
}
