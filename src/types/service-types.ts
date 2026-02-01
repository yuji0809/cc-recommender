/**
 * Service Types
 *
 * Types for service layer inputs and outputs
 */

import type { Recommendation } from "./domain-types.js";
import type { ProjectMetadata, ScoreBreakdown } from "./scoring-types.js";

/** プロジェクト情報 (分析結果) */
export type ProjectInfo = {
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
  /** プロジェクトメタデータ (サイズ、種類、チーム規模等) */
  metadata?: ProjectMetadata;
};

/** スコア付きレコメンデーション */
export type ScoredRecommendation = {
  item: Recommendation;
  score: number;
  reasons: string[];
  /** スコアの内訳 (拡張スコアリングが有効な場合) */
  breakdown?: ScoreBreakdown;
};
