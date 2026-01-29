# Architecture Documentation

## 概要

cc-recommender は、レイヤードアーキテクチャに基づいて設計された MCP サーバーです。
各レイヤーは明確な責務を持ち、依存関係の方向が一方向に保たれています。

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│                       (tools/handlers/)                       │
│  - recommend-skills.tool.ts                                  │
│  - search-skills.tool.ts                                     │
│  - get-skill-details.tool.ts                                 │
│  - list-categories.tool.ts                                   │
│  - get-stats.tool.ts                                         │
└────────────────────┬────────────────────────────────────────┘
                     │ depends on
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│                       (services/)                            │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │    Analyzer      │  │   Recommender    │                │
│  │                  │  │                  │                │
│  │ - Project        │  │ - Scoring        │                │
│  │   Analyzer       │  │ - Search         │                │
│  │ - Parsers:       │  │ - Formatting     │                │
│  │   - package.json │  │                  │                │
│  │   - requirements │  │                  │                │
│  │   - go.mod       │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │         Data Fetchers                │                  │
│  │  - mcp-fetcher.ts                    │                  │
│  │  - plugin-fetcher.ts                 │                  │
│  │  - skill-fetcher.ts                  │                  │
│  └──────────────────────────────────────┘                  │
└────────────────────┬────────────────────────────────────────┘
                     │ depends on
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Access Layer                         │
│                    (repositories/)                           │
│  - recommendation.repository.ts (with caching)               │
└────────────────────┬────────────────────────────────────────┘
                     │ depends on
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│                                                              │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐             │
│  │   Config     │  │  Utils   │  │  Types   │             │
│  │              │  │          │  │          │             │
│  │ - constants  │  │ - glob   │  │ - domain │             │
│  │ - mappings   │  │   matcher│  │ - service│             │
│  │ - scoring    │  │          │  │ - raw    │             │
│  └──────────────┘  └──────────┘  └──────────┘             │
│                                                              │
│  ┌────────────────────────────────────┐                    │
│  │          Schemas (Zod)             │                    │
│  │  - tool-schemas.ts                 │                    │
│  └────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Server Layer                            │
│                      (server/)                               │
│  - mcp-server.ts (setup)                                     │
│  - tool-registry.ts (registration)                           │
└─────────────────────────────────────────────────────────────┘
```

## レイヤー詳細

### 1. Presentation Layer (tools/handlers/)

**責務:**
- MCP ツールのリクエストを受け取る
- 入力バリデーション（Zod スキーマ使用）
- Business Logic Layer を呼び出す
- レスポンスをフォーマットして返す

**ファイル:**
- `index.ts` - ツールの公開 API（外部からはこれを使用）
- `recommend-skills.tool.ts` - プロジェクト分析に基づく推薦
- `search-skills.tool.ts` - キーワード検索
- `get-skill-details.tool.ts` - 詳細情報取得
- `list-categories.tool.ts` - カテゴリ一覧
- `get-stats.tool.ts` - 統計情報

**依存関係:**
- Business Logic Layer (services/)
- Schemas (schemas/)
- Types (types/index.ts)

### 2. Business Logic Layer (services/)

**責務:**
- ビジネスロジックの実装
- データの変換・加工
- アルゴリズムの実装

#### 2.1 Analyzer (services/analyzer/)

**責務:**
- プロジェクトディレクトリのスキャン
- ファイルの解析
- 言語・フレームワーク・依存関係の検出

**ファイル:**
- `project-analyzer.service.ts` - メイン分析ロジック
- `parsers/package-json.parser.ts` - Node.js プロジェクト解析
- `parsers/requirements-txt.parser.ts` - Python プロジェクト解析
- `parsers/go-mod.parser.ts` - Go プロジェクト解析

**依存関係:**
- Config (file-mappings, constants)
- Types (service-types)

#### 2.2 Recommender (services/recommender/)

**責務:**
- スコアリングアルゴリズムの実装
- 推薦結果の生成
- 検索機能
- 結果のフォーマット

**ファイル:**
- `recommendation.service.ts` - メイン推薦ロジック
- `search.service.ts` - 検索機能
- `scoring/scorer.ts` - スコアリングアルゴリズム
- `formatters.ts` - 結果フォーマッター

**依存関係:**
- Config (scoring-config)
- Types (domain-types, service-types)
- Utils (glob-matcher)

#### 2.3 Data Fetchers (services/)

**責務:**
- 外部データソースからの情報取得
- 生データの変換

**ファイル:**
- `mcp-fetcher.ts` - MCP サーバー情報取得
- `plugin-fetcher.ts` - プラグイン情報取得
- `skill-fetcher.ts` - スキル情報取得

**依存関係:**
- Types (domain-types, raw-types)

### 3. Data Access Layer (repositories/)

**責務:**
- データベースへのアクセス
- データのキャッシング
- データの永続化

**ファイル:**
- `recommendation.repository.ts` - レコメンデーションデータベースへのアクセス

**特徴:**
- シングルトンパターンでキャッシュを実装
- ファイルシステムからの読み込み
- JSON パース・バリデーション

**依存関係:**
- Types (domain-types)

### 4. Infrastructure Layer

#### 4.1 Config (config/)

**責務:**
- アプリケーション設定の管理
- 定数の定義
- マッピングテーブルの提供

**ファイル:**
- `constants.ts` - アプリケーション定数
- `file-mappings.ts` - ファイル拡張子と言語/フレームワークのマッピング
- `scoring-config.ts` - スコアリングの重み・閾値・係数

#### 4.2 Utils (utils/)

**責務:**
- 共通ユーティリティ関数
- 汎用ヘルパー

**ファイル:**
- `glob-matcher.ts` - Glob パターンマッチング

#### 4.3 Types (types/)

**責務:**
- 型定義の集約
- ドメインモデルの定義
- 公開 API の提供

**ファイル:**
- `index.ts` - 型定義の公開 API（外部からはこれを使用）
- `domain-types.ts` - ドメインモデル（Recommendation, Author, etc.）
- `service-types.ts` - サービス層の型（ProjectInfo, ScoredRecommendation）
- `raw-types.ts` - 外部データの型（RawPluginEntry, RawMCPEntry, etc.）

#### 4.4 Schemas (schemas/)

**責務:**
- 入力バリデーションスキーマ
- Zod スキーマの定義

**ファイル:**
- `tool-schemas.ts` - MCP ツールの入力スキーマ

### 5. Server Layer (server/)

**責務:**
- MCP サーバーのセットアップ
- ツールの登録
- サーバーの起動

**ファイル:**
- `mcp-server.ts` - サーバーセットアップと起動
- `tool-registry.ts` - ツール登録ロジック

## 依存関係のルール

### レイヤー間の依存

```
Presentation → Business Logic → Data Access → Infrastructure
                                            ↑
                                            │
                                         Server
```

### 許可される依存

- ✅ Presentation → Business Logic
- ✅ Presentation → Infrastructure (Types, Schemas)
- ✅ Business Logic → Data Access
- ✅ Business Logic → Infrastructure
- ✅ Data Access → Infrastructure
- ✅ Server → Presentation (ツール登録のため - handlers/index.ts 経由)
- ✅ Server → Infrastructure (types/index.ts 経由)

### 禁止される依存

- ❌ Infrastructure → 任意の上位レイヤー
- ❌ Data Access → Business Logic
- ❌ Data Access → Presentation
- ❌ Business Logic → Presentation
- ❌ 循環依存（すべて）

## データフロー

### 推薦フロー

```
1. User Request
   ↓
2. MCP Tool Handler (recommend-skills.tool.ts)
   - 入力バリデーション (Zod)
   ↓
3. Project Analyzer (project-analyzer.service.ts)
   - ディレクトリスキャン
   - ファイル解析
   - パーサー呼び出し
   ↓
4. Recommendation Service (recommendation.service.ts)
   - データベースから候補取得 (Repository)
   - スコアリング (Scorer)
   - フィルタリング
   - ソート
   ↓
5. Formatter (formatters.ts)
   - 結果フォーマット
   - グルーピング
   ↓
6. Response
```

### スコアリングアルゴリズム

```typescript
// 6段階のスコアリング
1. 言語マッチング (重み: 5)
   - プロジェクトで使用されている言語との一致

2. フレームワークマッチング (重み: 4)
   - プロジェクトで使用されているフレームワークとの一致

3. 依存関係マッチング (重み: 3)
   - package.json などの依存関係との一致

4. ファイルパターンマッチング (重み: 2)
   - Glob パターンによるファイル一致

5. キーワードマッチング (重み: 1)
   - 説明文キーワードとの一致

6. 公式ブースト (係数: 1.5)
   - 公式アイテムのスコアを 1.5 倍

スコア閾値:
- 高: ≥ 10
- 中: 5-9
- 低: 1-4
```

## キャッシング戦略

### Repository レベル

```typescript
class RecommendationRepository {
  private cache: RecommendationDatabase | null = null;

  async load(): Promise<RecommendationDatabase> {
    if (this.cache) {
      return this.cache;
    }
    // ファイルから読み込み
    this.cache = loadFromFile();
    return this.cache;
  }
}
```

- 初回読み込み後、メモリにキャッシュ
- サーバー起動時に1度だけ読み込み
- ホットリロードなし（再起動が必要）

## エラーハンドリング

### 戦略

1. **入力エラー** - Zod による自動バリデーション
2. **ファイル読み込みエラー** - try-catch で捕捉、null/空配列を返す
3. **パースエラー** - try-catch で捕捉、エラーログ出力
4. **予期しないエラー** - 上位レイヤーに伝播

### 例

```typescript
try {
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
} catch (error) {
  console.error(`Failed to parse ${path}:`, error);
  return null;
}
```

## テスト戦略

### カバレッジ目標

新規コードは高いカバレッジを維持し、重要なロジックは必ずテストを書く。

### テスト種類

1. **ユニットテスト**
   - 各サービスの単体テスト
   - モックデータを使用

2. **統合テスト**
   - 複数のサービスを組み合わせたテスト
   - 実際のプロジェクトを使用

### テストファイル

- `tests/analyzer.test.ts` - 分析機能のテスト
- `tests/recommender.test.ts` - 推薦機能のテスト

## パフォーマンス最適化

### 1. ファイルスキャン

- 最大深度: 5
- 最大ファイル数: 1000
- スキップディレクトリ: node_modules, .git, dist, build, coverage

### 2. スコアリング

- 早期終了: minScore 未満は即スキップ
- ソートは最後に1度だけ
- 結果数制限: maxResults でスライス

### 3. キャッシング

- データベースをメモリにキャッシュ
- ファイル I/O を最小化

## 将来の拡張ポイント

### 1. 新しいデータソースの追加

```typescript
// services/new-source-fetcher.ts
export async function fetchFromNewSource(): Promise<Recommendation[]> {
  // 実装
}
```

### 2. 新しいパーサーの追加

```typescript
// services/analyzer/parsers/cargo-toml.parser.ts
export async function parseCargoToml(
  projectPath: string,
  info: ProjectInfo
): Promise<void> {
  // Rust プロジェクトの解析
}
```

### 3. 新しいツールの追加

```typescript
// tools/handlers/compare-skills.tool.ts
export async function compareSkills(
  input: CompareSkillsInput,
  database: RecommendationDatabase
): Promise<CompareSkillsResult> {
  // スキル比較機能
}
```

## まとめ

このアーキテクチャは以下の特徴を持ちます:

- ✅ レイヤー分離による保守性の向上
- ✅ 単一責任原則による可読性の向上
- ✅ 直接インポートによる明確な依存関係
- ✅ 型安全性の確保
- ✅ テストの容易性
- ✅ 拡張性の確保

各レイヤーが明確な責務を持ち、依存関係が一方向に保たれているため、
新機能の追加や既存機能の変更が容易です。
