/**
 * Scoring Types
 *
 * Types for enhanced scoring features (context understanding and semantic similarity)
 */

/** プロジェクトのサイズ分類 */
export type ProjectSize = "small" | "medium" | "large" | "enterprise";

/** プロジェクトの種類 */
export type ProjectKind = "monorepo" | "library" | "application" | "unknown";

/** プロジェクトメタデータ */
export type ProjectMetadata = {
  /** プロジェクトサイズ */
  size: ProjectSize;
  /** プロジェクトの種類 */
  kind: ProjectKind;
  /** 推定チームサイズ (1: 個人, 2-5: 小規模, 6-20: 中規模, 21+: 大規模) */
  estimatedTeamSize: number;
  /** ワークスペース/パッケージ数（モノレポの場合） */
  workspaceCount?: number;
  /** ファイル総数 */
  fileCount: number;
  /** 言語数 */
  languageCount: number;
};

/** タグの共起行列データ */
export type SimilarityMatrix = {
  /** タグペアごとの共起カウント */
  cooccurrence: Map<string, Map<string, number>>;
  /** 各タグの出現総数 */
  tagCounts: Map<string, number>;
};

/** スコアの内訳 */
export type ScoreBreakdown = {
  /** 基本マッチスコア (言語、フレームワーク、依存関係、ファイル) */
  baseScore: number;
  /** コンテキストスコア (プロジェクトサイズ、チーム規模、モノレポ) */
  contextScore: number;
  /** 類似性スコア (タグの共起関係) */
  similarityScore: number;
  /** 品質スコア (公式性、スター、鮮度、ソース) */
  qualityScore: number;
  /** 最終スコア */
  finalScore: number;
};
