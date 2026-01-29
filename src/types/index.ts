/**
 * cc-recommender Type Definitions
 * 
 * Unified schema for skills, plugins, and MCP servers
 */

/** レコメンドアイテムのタイプ */
export type RecommendationType = 
  | "plugin"      // Claude Code プラグイン
  | "mcp"         // MCP サーバー
  | "skill"       // スキル
  | "workflow"    // ワークフロー
  | "hook"        // フック
  | "command"     // スラッシュコマンド
  | "agent";      // エージェント

/** データソースの種類 */
export type SourceType = 
  | "official"        // 公式 (Anthropic)
  | "community"       // コミュニティマーケット
  | "awesome-list";   // awesome-* リスト

/** インストール方法 */
export type InstallMethod = 
  | "plugin"      // /plugin install X
  | "mcp-add"     // claude mcp add X
  | "manual";     // 手動コピー / git clone

/** 作者情報 */
export interface Author {
  name: string;
  url?: string;
  email?: string;
}

/** 検出ルール */
export interface DetectionRules {
  /** package.json の依存関係 */
  dependencies?: string[];
  /** ファイルパターン (glob) */
  files?: string[];
  /** 使用言語 */
  languages?: string[];
  /** フレームワーク */
  frameworks?: string[];
  /** 説明文キーワード */
  keywords?: string[];
}

/** 品質指標 */
export interface Metrics {
  /** データソース */
  source: SourceType;
  /** セキュリティスコア (0-100, cc-audit) */
  securityScore?: number;
  /** GitHub スター数 */
  stars?: number;
  /** 公式かどうか */
  isOfficial?: boolean;
  /** 最終更新日 */
  lastUpdated?: string;
}

/** インストール情報 */
export interface InstallInfo {
  /** インストール方法 */
  method: InstallMethod;
  /** インストールコマンド */
  command?: string;
  /** マーケットプレイス名 */
  marketplace?: string;
}

/** 統一レコメンデーションアイテム */
export interface Recommendation {
  /** 一意な識別子 */
  id: string;
  /** 表示名 */
  name: string;
  /** タイプ */
  type: RecommendationType;
  /** リポジトリ/ソースURL */
  url: string;
  /** 説明文 */
  description: string;
  /** 作者 */
  author: Author;
  /** カテゴリ */
  category: string;
  /** タグ */
  tags: string[];
  /** 検出ルール */
  detection: DetectionRules;
  /** 品質指標 */
  metrics: Metrics;
  /** インストール情報 */
  install: InstallInfo;
}

/** スコア付きレコメンデーション */
export interface ScoredRecommendation {
  item: Recommendation;
  score: number;
  reasons: string[];
}

/** プロジェクト情報 (分析結果) */
export interface ProjectInfo {
  /** プロジェクトパス */
  path: string;
  /** 使用言語 */
  languages: string[];
  /** 依存関係 (package.json, requirements.txt, etc.) */
  dependencies: string[];
  /** ファイル一覧 */
  files: string[];
  /** フレームワーク */
  frameworks: string[];
  /** プロジェクト説明 (README等から) */
  description?: string;
}

/** データベース (全レコメンデーション) */
export interface RecommendationDatabase {
  version: string;
  lastUpdated: string;
  items: Recommendation[];
}

/** プラグインマーケットプレイスのエントリ (生データ) */
export interface RawPluginEntry {
  name: string;
  description: string;
  version?: string;
  author: {
    name: string;
    email?: string;
  };
  source: string | { url: string; subPath?: string };
  category: string;
  homepage?: string;
  tags?: string[];
  lspServers?: Record<string, unknown>;
}

/** awesome-mcp-servers のエントリ (パース後) */
export interface RawMCPEntry {
  owner: string;
  repo: string;
  url: string;
  description: string;
  language?: string;
  scope?: "cloud" | "local";
  platforms?: string[];
  isOfficial?: boolean;
  category: string;
}

/** awesome-claude-code CSV のエントリ */
export interface RawSkillEntry {
  name: string;
  url: string;
  author: string;
  authorUrl: string;
  license?: string;
  description: string;
  category: string;
}
