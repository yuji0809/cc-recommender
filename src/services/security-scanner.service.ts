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
 * シェル引数をエスケープしてコマンドインジェクションを防ぐ
 *
 * @param arg - エスケープする引数
 * @returns エスケープされた引数
 */
function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

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
    // バリデーション: repoUrl が有効な GitHub URL であることを確認
    const urlPattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+(\/.*)?$/;
    if (!urlPattern.test(repoUrl)) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    // バリデーション: scanType が有効な値であることを確認
    const validScanTypes = ["mcp", "skill", "plugin"] as const;
    if (!validScanTypes.includes(scanType)) {
      throw new Error(`Invalid scan type: ${scanType}`);
    }

    // cc-audit を --remote モードで実行
    // --config で現在のプロジェクトの設定ファイルを使用
    const configPath = `${process.cwd()}/.cc-audit.yaml`;

    // コマンドインジェクション対策: すべての引数をエスケープ
    const command = `npx -y @cc-audit/cc-audit check --remote ${escapeShellArg(repoUrl)} --type ${escapeShellArg(scanType)} --config ${escapeShellArg(configPath)} --format json --ci`;

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

/** scanRepositories のオプション */
export type ScanRepositoriesOptions = {
  /** この時刻（epoch ms）を過ぎたら新しい batch を始めない */
  deadline?: number;
  /** 現在時刻の取得（テスト用） */
  now?: () => number;
  /** 1 件をスキャンする関数（テスト用） */
  scan?: (repoUrl: string, scanType: "mcp" | "skill" | "plugin") => Promise<SecurityScanResult>;
};

/**
 * 複数のリポジトリを並列スキャン
 *
 * deadline を過ぎると残りはスキャンせずに返す。スキャンしなかったリポジトリは
 * 結果のマップに含まれない（呼び出し側ではスコアなしのまま残り、次回スキャンされる）。
 *
 * @param repos - スキャン対象のリポジトリ情報
 * @param concurrency - 並列実行数（デフォルト: 10）
 * @param options - 期限などのオプション
 * @returns スキャン結果のマップ
 */
export async function scanRepositories(
  repos: Array<{ url: string; type: "mcp" | "skill" | "plugin" }>,
  concurrency = 10,
  options: ScanRepositoriesOptions = {},
): Promise<Map<string, SecurityScanResult>> {
  const { deadline, now = Date.now, scan = scanRepository } = options;
  const results = new Map<string, SecurityScanResult>();

  // 並列実行数を制限しながらスキャン
  for (let i = 0; i < repos.length; i += concurrency) {
    if (deadline !== undefined && now() >= deadline) {
      console.log(
        `Scan time limit reached: scanned ${i}/${repos.length} repositories. The rest will be scanned in a later run.`,
      );
      break;
    }

    const batch = repos.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (repo) => ({
        url: repo.url,
        result: await scan(repo.url, repo.type),
      })),
    );

    for (const { url, result } of batchResults) {
      results.set(url, result);
    }

    // 進捗表示
    console.log(`Scanned ${Math.min(i + concurrency, repos.length)}/${repos.length} repositories`);
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
