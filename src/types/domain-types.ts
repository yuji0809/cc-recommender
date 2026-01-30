/**
 * Domain Types
 *
 * Core business domain types for recommendations
 */

/** レコメンドアイテムのタイプ */
export type RecommendationType =
  | "plugin" // Claude Code プラグイン
  | "mcp" // MCP サーバー
  | "skill" // スキル
  | "workflow" // ワークフロー
  | "hook" // フック
  | "command" // スラッシュコマンド
  | "agent"; // エージェント

/** データソースの種類 */
export type SourceType =
  | "official" // 公式 (Anthropic)
  | "community" // コミュニティマーケット
  | "awesome-list"; // awesome-* リスト

/** インストール方法 */
export type InstallMethod =
  | "plugin" // /plugin install X
  | "mcp-add" // claude mcp add X
  | "manual"; // 手動コピー / git clone

/** 作者情報 */
export type Author = {
  name: string;
  url?: string;
  email?: string;
};

/** 検出ルール */
export type DetectionRules = {
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
};

/** 品質指標 */
export type Metrics = {
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
};

/** インストール情報 */
export type InstallInfo = {
  /** インストール方法 */
  method: InstallMethod;
  /** インストールコマンド */
  command?: string;
  /** マーケットプレイス名 */
  marketplace?: string;
};

/** 統一レコメンデーションアイテム */
export type Recommendation = {
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
};

/** データベース (全レコメンデーション) */
export type RecommendationDatabase = {
  version: string;
  lastUpdated: string;
  items: Recommendation[];
};

/** プラグインデータベース */
export type PluginDatabase = {
  version: string;
  lastUpdated: string;
  items: Recommendation[];
};

/** MCPサーバーデータベース */
export type MCPServerDatabase = {
  version: string;
  lastUpdated: string;
  items: Recommendation[];
};

/** スキルデータベース */
export type SkillDatabase = {
  version: string;
  lastUpdated: string;
  items: Recommendation[];
};
