/**
 * Enhanced Scoring Configuration
 *
 * Configuration for context-aware and semantic similarity scoring
 */

/** コンテキストスコアの重み */
export const CONTEXT_SCORE_WEIGHTS = {
  /** プロジェクトサイズマッチ */
  sizeMatch: 2.0,
  /** モノレポ対応ツール */
  monorepoBonus: 3.0,
  /** チーム規模マッチ */
  teamSizeMatch: 1.5,
} as const;

/** プロジェクトサイズ分類の閾値 */
export const PROJECT_SIZE_THRESHOLDS = {
  small: { maxFiles: 100, maxDeps: 10 },
  medium: { maxFiles: 500, maxDeps: 30 },
  large: { maxFiles: 2000, maxDeps: 100 },
  // enterprise: それ以上
} as const;

/** 意味的類似性の閾値 */
export const SIMILARITY_THRESHOLDS = {
  /** 最小共起カウント（このペアを考慮する最小出現回数） */
  minCooccurrence: 3,
  /** Jaccard係数の閾値 */
  minJaccardSimilarity: 0.3,
  /** 類似性スコアの最大値 */
  maxSimilarityBonus: 5.0,
} as const;

/** 拡張スコアリングの有効/無効フラグ */
export const ENHANCED_SCORING_FLAGS = {
  /** コンテキストスコアリングを有効化 */
  enableContextScoring: true,
  /** 意味的類似性スコアリングを有効化 */
  enableSimilarityScoring: true,
} as const;
