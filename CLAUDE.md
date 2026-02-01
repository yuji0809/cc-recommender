# cc-recommender Development Guide

このドキュメントは、cc-recommender プロジェクトの開発ガイドラインを定義します。
新しいコードを追加・変更する際は、必ずこのガイドラインに従ってください。

## プロジェクト概要

Claude Code のスキル、プラグイン、MCP サーバーを推薦する MCP サーバー。
プロジェクトを分析し、適切な拡張機能を提案します。

## アーキテクチャ原則

### 1. レイヤードアーキテクチャ

```
presentation (tools) → business logic (services) → data access (repositories)
                    ↓
                 config, utils, types
```

**依存関係のルール:**
- 上位レイヤーは下位レイヤーに依存できる
- 下位レイヤーは上位レイヤーに依存してはいけない
- 同一レイヤー内での依存は最小限に

### 2. 単一責任の原則 (SRP)

- 各ファイルは1つの責務のみを持つ
- 大きくなりすぎた場合は分割を検討

### 3. 直接インポートの原則

**原則: 直接個別ファイルからインポート**

**例外: 以下のディレクトリのみ index.ts を使用可能**
- `types/index.ts` - 型定義の公開 API（頻繁に使用されるため）
- `tools/handlers/index.ts` - MCP ツールの公開 API（外部インターフェース）

```typescript
// ✅ 許可: 公開 API からのインポート
import { Recommendation, ProjectInfo } from "../../types/index.js";
import { recommendSkills, searchSkills } from "../../tools/handlers/index.js";

// ✅ 推奨: その他は直接個別ファイルからインポート
import { analyzeProject } from "../../services/analyzer/project-analyzer.service.js";
import { calculateScore } from "../../services/recommender/scoring/scorer.js";

// ❌ 禁止: services/, config/, utils/ などに index.ts を作成
import { analyzeProject } from "../../services/analyzer/index.js"; // NG
```

**理由:**
- インポート元が明確
- 循環依存の防止
- 未使用コードの検出が容易
- 外部 API は index.ts で明示化
- 内部実装は直接インポートで変更に強く

## ディレクトリ構造

```
src/
├── config/              # 設定ファイル（定数、マッピング）
│   ├── constants.ts     # アプリケーション定数
│   ├── file-mappings.ts # ファイル拡張子とフレームワークのマッピング
│   ├── curated-list-sources.ts # キュレーションリストソース定義
│   ├── direct-skill-sources.ts # 直接スキルソース定義
│   ├── env.ts           # 環境変数設定
│   └── scoring-config.ts # スコアリングの重み・閾値
│
├── repositories/        # データアクセス層
│   ├── recommendation.repository.ts # データベース読み込み・キャッシュ
│   └── remote-data.repository.ts    # リモートデータ取得（CDN/GitHub）
│
├── utils/              # 共通ユーティリティ
│   └── glob-matcher.ts # Glob パターンマッチング
│
├── types/              # 型定義（ドメイン別に分割）
│   ├── index.ts        # 型定義の公開 API
│   ├── domain-types.ts # ドメイン型（Recommendation, Author, etc.）
│   ├── service-types.ts # サービス型（ProjectInfo, ScoredRecommendation）
│   └── raw-types.ts    # 外部データ型（RawPluginEntry, etc.）
│
├── schemas/            # Zod バリデーションスキーマ
│   └── tool-schemas.ts # MCP ツールの入力スキーマ
│
├── services/           # ビジネスロジック層
│   ├── analyzer/       # プロジェクト分析サービス
│   │   ├── parsers/    # 言語別パーサー
│   │   │   ├── package-json.parser.ts
│   │   │   ├── requirements-txt.parser.ts
│   │   │   ├── go-mod.parser.ts
│   │   │   └── （その他言語用パーサー）
│   │   └── project-analyzer.service.ts # メイン分析ロジック
│   │
│   ├── fetchers/       # 外部データ取得
│   │   ├── mcp/        # MCP サーバー取得
│   │   │   ├── mcp-fetcher.ts
│   │   │   └── official-mcp-fetcher.ts
│   │   ├── plugins/    # プラグイン取得
│   │   │   └── plugin-fetcher.ts
│   │   └── skills/     # スキル取得
│   │       ├── common/  # 共通ユーティリティ
│   │       │   ├── github-api.ts # GitHub API 呼び出し
│   │       │   ├── skill-parser.ts # スキルパース処理
│   │       │   └── types.ts # フェッチャー用の内部型
│   │       ├── curated-list-fetcher.ts # キュレーションリスト取得
│   │       ├── direct-skill-fetcher.ts # 直接スキル取得
│   │       └── skill-fetcher.ts # メインフェッチャー
│   │
│   ├── recommender/    # 推薦サービス
│   │   ├── scoring/    # スコアリングロジック
│   │   │   └── scorer.ts
│   │   ├── recommendation.service.ts # メイン推薦ロジック
│   │   ├── search.service.ts         # 検索機能
│   │   ├── quality-scorer.ts         # 品質スコア算出
│   │   └── formatters.ts             # 結果フォーマッター
│   │
│   └── security-scanner.service.ts # セキュリティスコア取得
│
├── tools/              # MCP ツール層（プレゼンテーション）
│   └── handlers/       # 各ツールの実装
│       ├── index.ts    # ツールの公開 API
│       ├── recommend-skills.tool.ts
│       ├── search-skills.tool.ts
│       ├── get-skill-details.tool.ts
│       ├── list-categories.tool.ts
│       └── get-stats.tool.ts
│
├── server/             # MCP サーバー設定
│   ├── mcp-server.ts   # サーバーセットアップ
│   └── tool-registry.ts # ツール登録
│
└── index.ts            # エントリーポイント（最小限）
```

### Claude Code 拡張機能ディレクトリ

```
.claude/
├── agents/              # カスタムエージェント定義
│   ├── architecture-agent.md   # アーキテクチャチェック
│   ├── security-agent.md       # セキュリティチェック
│   ├── typescript-agent.md     # TypeScript ベストプラクティス
│   └── documentation-agent.md  # ドキュメント整合性チェック
│
├── commands/            # カスタムコマンド
│   └── pre-commit-check.md    # コミット前の包括的チェック
│
└── skills/              # カスタムスキル
    ├── documentation-check.md  # ドキュメントチェックスキル
    ├── architecture-check.md   # アーキテクチャチェックスキル
    ├── security-check.md       # セキュリティチェックスキル
    ├── typescript-check.md     # TypeScript チェックスキル
    └── tdd.md                  # TDD スキル
```

**各エージェントの役割:**
- **Architecture Agent**: プロジェクトのアーキテクチャと設計思想を確認し、一貫性を保つ
- **Security Agent**: セキュリティベストプラクティスを確認し、脆弱性を検出
- **TypeScript Agent**: TypeScript のベストプラクティスに従ってコードをレビュー
- **Documentation Agent**: ドキュメントとコードの整合性を確認

**カスタムコマンド:**
- `/pre-commit-check`: コミット前に4つのエージェント（Architecture, Security, TypeScript, Documentation）を並列実行し、包括的なコード品質チェックを実施

## ファイル命名規則

### パターン

```
<name>.<type>.ts
```

### タイプ別の suffix

- `.service.ts` - サービス層のロジック
- `.repository.ts` - データアクセス層
- `.tool.ts` - MCP ツールハンドラー
- `.parser.ts` - パーサー
- `.types.ts` - 型定義
- `-config.ts` - 設定ファイル

### 例

```typescript
// ✅ 良い例
project-analyzer.service.ts
recommendation.repository.ts
recommend-skills.tool.ts
package-json.parser.ts

// ❌ 悪い例
analyzer.ts           // 曖昧
recommend.ts          // タイプ不明
packageJson.ts        // ケバブケースではない
```

## コーディング規約

### 1. TypeScript

```typescript
// ✅ type を使用（interface は禁止）
export type User = {
  id: string;
  name: string;
};

// ❌ interface は使用しない
export interface User {
  id: string;
  name: string;
}
```

## TDD (Test-Driven Development) 開発手法

### 基本原則

**新機能の実装は必ずTDDで行う**

```
1. 🔴 Red:   失敗するテストを先に書く
2. 🟢 Green: テストを通す最小限のコードを書く
3. 🔵 Refactor: コードをリファクタリング
```

### TDD実践フロー

#### Step 1: Red（テストを先に書く）

```bash
# テストファイルを作成
tests/services/new-feature.test.ts

# ウォッチモードで開発
pnpm run test:watch
```

```typescript
// tests/services/new-feature.test.ts
import { describe, expect, it } from "vitest";
import { newFeature } from "../../src/services/new-feature.js";

describe("newFeature", () => {
  it("should handle basic case", () => {
    const result = newFeature("input");
    expect(result).toBe("expected");
  });

  it("should handle edge case", () => {
    const result = newFeature("");
    expect(result).toBe("");
  });
});
```

**確認:** テストが失敗すること（関数がまだ存在しない）

#### Step 2: Green（最小限の実装）

```typescript
// src/services/new-feature.ts
export function newFeature(input: string): string {
  return input; // 最小限の実装
}
```

**確認:** テストが通ること

#### Step 3: Refactor（リファクタリング）

```typescript
// src/services/new-feature.ts
export function newFeature(input: string): string {
  // より良い実装にリファクタリング
  if (!input) return "";
  return processInput(input);
}

function processInput(input: string): string {
  // 処理を分割して読みやすく
  return input.trim().toLowerCase();
}
```

**確認:** テストが全て通ること

### テストの構造化

```typescript
describe("Feature Name", () => {
  describe("Normal Cases", () => {
    it("should handle typical input");
    it("should handle multiple items");
  });

  describe("Edge Cases", () => {
    it("should handle empty input");
    it("should handle single item");
  });

  describe("Error Cases", () => {
    it("should handle invalid input gracefully");
  });
});
```

### TDDチェックリスト

新機能実装時に必ず確認：

- [ ] **テストを先に書いた**
  - [ ] 正常系のテストケース
  - [ ] エッジケースのテストケース
  - [ ] テストが失敗することを確認
- [ ] **最小限の実装でテストを通した**
  - [ ] 過剰な実装をしていない
  - [ ] テストが全て通る
- [ ] **リファクタリングした**
  - [ ] コードが読みやすい
  - [ ] 重複が排除されている
  - [ ] テストが全て通る（再確認）
- [ ] **品質チェック**
  - [ ] `pnpm run typecheck` が通る
  - [ ] `pnpm run lint` が通る
  - [ ] カバレッジが適切

### 詳細ガイド

TDDの詳細な実践方法は [docs/TDD.md](./docs/TDD.md) を参照してください。

## 新機能追加ガイドライン

### 1. 新しいツールを追加する場合

```bash
# 1. スキーマを定義
src/schemas/tool-schemas.ts に追加

# 2. ツールハンドラーを作成
src/tools/handlers/new-feature.tool.ts

# 3. ツールを登録
src/server/tool-registry.ts で registerTool() 呼び出し

# 4. テストを追加
tests/new-feature.test.ts
```

### 2. 新しいサービスを追加する場合

```bash
# 1. サービスファイルを作成
src/services/new-service/new-service.service.ts

# 2. 必要に応じてサブモジュール化
src/services/new-service/
  ├── core-logic.ts
  ├── helper.ts
  └── formatter.ts

# 3. 型定義を追加（必要に応じて）
src/types/service-types.ts または新しいファイル

# 4. テストを追加
tests/new-service.test.ts
```

### 3. 新しいパーサーを追加する場合

```bash
# 1. パーサーファイルを作成
src/services/analyzer/parsers/new-lang.parser.ts

# 2. メインアナライザーに統合
src/services/analyzer/project-analyzer.service.ts

# 3. ファイルマッピングを追加
src/config/file-mappings.ts

# 4. テストを追加
tests/analyzer/ に新しい言語のテストケースを追加
```

## テスト規約

### カバレッジ目標

- 新規コードは高いカバレッジを維持
- 重要なロジックは必ずテストを書く

## 禁止事項

### ❌ 絶対にやってはいけないこと

1. **index.ts の作成**
   - すべてのインポートは直接個別ファイルから行う

2. **interface の使用**
   - すべて `type` を使用する

3. **循環依存の作成**
   - レイヤー間の依存方向を守る
   - 同一レイヤー内での循環依存も避ける

4. **グローバル変数の使用**
   - 必要な場合は明示的にパラメータで渡す
   - データベースなどは repository を通してアクセス

5. **巨大なファイルの作成**
   - ファイルが大きくなりすぎた場合は分割を検討
   - 単一責任の原則を守る

## ツールとコマンド

### 開発時に使用するコマンド

```bash
# 型チェック
pnpm run typecheck

# Lint（自動修正）
pnpm run lint:fix

# セキュリティ監査
pnpm run audit

# セキュリティ監査（ウォッチモード）
pnpm run audit:watch

# ベースライン作成（初回のみ）
pnpm run audit:baseline

# 変更検知（ベースラインとの差分）
pnpm run audit:drift

# テスト実行
pnpm run test

# カバレッジ確認
pnpm run test:coverage

# ビルド
pnpm run build

# 全チェック（型チェック + Lint + セキュリティ監査）
pnpm run check
```

### セキュリティ監査の活用シーン

**開発中:**
```bash
# リアルタイム監視（ファイル変更時に自動スキャン）
pnpm run audit:watch
```

**リリース前:**
```bash
# ベースライン作成（安全な状態を記録）
pnpm run audit:baseline

# 後日、変更があった場合
pnpm run audit:drift  # 差分を検知
```

**依存関係更新後:**
```bash
# 新しい脆弱性がないか確認
pnpm run audit
```

### CI/CD

- すべての PR で自動的に実行される:
  - 型チェック
  - Lint
  - セキュリティ監査
  - テスト
  - カバレッジチェック

## 参考資料

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - 詳細なアーキテクチャドキュメント
- [CONTRIBUTING.md](./CONTRIBUTING.md) - コントリビューションガイド
- [CHANGELOG.md](./CHANGELOG.md) - 変更履歴
- [README.md](./README.md) - プロジェクト概要

---

## チェックリスト（コード変更時）

新しいコードを書く前に、以下を確認してください:

- [ ] 適切なディレクトリに配置されているか？
- [ ] ファイル命名規則に従っているか？
- [ ] 直接インポートを使用しているか（index.ts は使っていないか）？
- [ ] 型定義は適切なファイルに配置されているか？
- [ ] レイヤー間の依存方向は正しいか？
- [ ] ファイルサイズは適切か？
- [ ] テストは書いたか？
- [ ] `pnpm run check` が通るか？
- [ ] ドキュメントを更新したか（必要に応じて）？

このガイドラインに従うことで、保守性が高く、拡張しやすいコードベースを維持できます。
