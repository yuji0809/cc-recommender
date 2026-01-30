# コードベース構造

## ディレクトリ構成

```
cc-recommender/
├── src/                      # ソースコード
│   ├── index.ts             # MCPサーバーエントリーポイント（5ツール登録）
│   ├── tools/               # MCPツール実装
│   │   └── index.ts         # 5つのツール定義とロジック
│   ├── types/               # 型定義
│   │   └── index.ts         # 統一スキーマ型定義（Zod + TypeScript）
│   └── services/            # ビジネスロジック
│       ├── analyzer/        # プロジェクト分析
│       ├── recommender/     # 推薦・スコアリング
│       ├── fetchers/        # データ取得
│       │   ├── plugin-fetcher.ts      # 公式プラグイン取得
│       │   ├── mcp-fetcher.ts         # awesome-mcp-servers取得
│       │   ├── official-mcp-fetcher.ts # 公式MCPレジストリ取得
│       │   └── skill-fetcher.ts       # awesome-claude-code取得
│       ├── repositories/    # データアクセス
│       └── security-scanner.service.ts # セキュリティスキャン
├── scripts/                 # ユーティリティスクリプト
│   └── fetch-data.ts        # 全ソースからデータ集約スクリプト
├── data/                    # データファイル
│   └── recommendations.json # 統合データベース（実行時に読み込み）
├── dist/                    # ビルド出力（TypeScriptコンパイル後）
├── package.json             # npm設定、依存関係、スクリプト
├── tsconfig.json            # TypeScript設定
├── README.md                # プロジェクトドキュメント
└── .gitignore               # Git無視ファイル
```

## 主要ファイルの役割

### `src/index.ts` (240行)
- MCPサーバーのエントリーポイント
- shebang: `#!/usr/bin/env node`
- データベース読み込み
- 5つのMCPツールを登録:
  1. `recommend_skills` - プロジェクト分析→推薦
  2. `search_skills` - キーワード検索
  3. `get_skill_details` - 詳細取得
  4. `list_categories` - カテゴリ一覧
  5. `get_stats` - 統計情報
- StdioServerTransport経由でClaude Codeと通信

### `src/types/index.ts`
統一スキーマ型定義:
- **Recommendation**: 推薦アイテムの統一型
  - `id`, `name`, `description`, `type`, `category`
  - `url`, `tags`, `author`
  - `detection`: 検出ルール（言語、フレームワーク、依存関係、ファイル、キーワード）
  - `install`: インストール情報（method, command, marketplace）
  - `metrics`: メトリクス（isOfficial, source, stars, lastUpdated, securityScore）

- **ProjectInfo**: プロジェクト分析結果
  - `path`, `description`, `languages`, `frameworks`, `dependencies`, `files`

- **RecommendationType**: `"plugin"` | `"mcp"` | `"skill"` | `"workflow"` | `"hook"` | `"command"` | `"agent"`

- **Raw Entry Types**: 各ソースからの生データ型
  - `RawPluginEntry`, `RawMCPEntry`, `RawSkillEntry`

### `src/tools/index.ts`
5つのツール実装:

1. **recommendSkills(params, database)**
   - プロジェクトパス分析
   - スコアリング（言語×5, フレームワーク×4, 依存関係×3, ファイル×2, キーワード×1）
   - フォーマットされた推薦結果返却

2. **searchSkills(params, database)**
   - キーワード検索（名前、説明、タグ）
   - 型フィルタリング可能

3. **getSkillDetails(params, database)**
   - 名前で特定アイテムの詳細取得

4. **listCategories(database)**
   - カテゴリ一覧とカウント

5. **getStats(database)**
   - データベース統計（総数、型別、ソース別、公式数）

### `src/services/analyzer.ts`
プロジェクト分析:
- **analyzeProject(path)**: プロジェクト全体を分析
- **scanDirectory(path)**: ディレクトリスキャン
- **parsePackageJson()**: package.json解析（言語、フレームワーク、依存関係）
- **parseGoMod()**: go.mod解析
- **parseRequirementsTxt()**: requirements.txt解析
- **CONFIG_FILE_MAPPINGS**: 設定ファイル→フレームワーク/ツールマッピング
- **EXTENSION_TO_LANGUAGE**: 拡張子→言語マッピング

### `src/services/recommender.ts`
推薦ロジック:
- **recommend(projectInfo, database, options)**
- スコアリングアルゴリズム実装
- フィルタリング（型、カテゴリ）
- ソート（スコア降順）

### `src/services/fetchers/*-fetcher.ts`
データ取得:
- **plugin-fetcher.ts**: `anthropics/claude-plugins-official/marketplace.json` (公式マーケットプレイス)
- **mcp-fetcher.ts**: `punkpeye/awesome-mcp-servers` (Markdownパース)
- **official-mcp-fetcher.ts**: `registry.modelcontextprotocol.io` (公式MCPレジストリAPI)
- **skill-fetcher.ts**: `hesreallyhim/awesome-claude-code` (CSVパース)

### `scripts/fetch-data.ts`
データ集約スクリプト:
1. 4つのfetcherからデータ取得（plugin, mcp×2, skill）
2. URL正規化で重複排除（公式を優先）
3. セキュリティスキャン実行
4. 3つのJSONファイルに分割出力（plugins.json, mcp-servers.json, skills.json）
5. 統計表示

### `data/recommendations.json`
統合データベース:
```json
{
  "version": "0.1.0",
  "lastUpdated": "2024-01-29T...",
  "items": [ /* Recommendation[] */ ]
}
```

## データフロー

```
外部ソース (GitHub)
    ↓
scripts/fetch-data.ts
    ↓ (services/*-fetcher.ts)
data/recommendations.json
    ↓
src/index.ts (loadDatabase)
    ↓
src/tools/index.ts (5ツール)
    ↓ (services/analyzer.ts, recommender.ts)
Claude Code (MCP Protocol)
```

## 依存関係グラフ

```
src/index.ts
  → src/types/index.ts
  → src/tools/index.ts
      → src/types/index.ts
      → src/services/analyzer.ts
      → src/services/recommender.ts

scripts/fetch-data.ts
  → src/types/index.ts
  → src/services/fetchers/plugin-fetcher.ts
  → src/services/fetchers/mcp-fetcher.ts
  → src/services/fetchers/official-mcp-fetcher.ts
  → src/services/fetchers/skill-fetcher.ts
  → src/services/security-scanner.service.ts
```

## ビルド成果物

```
dist/
├── index.js              # コンパイル済みエントリーポイント
├── index.d.ts            # 型定義
├── tools/
│   ├── index.js
│   └── index.d.ts
├── types/
│   ├── index.js
│   └── index.d.ts
└── services/
    ├── analyzer.js
    ├── analyzer.d.ts
    ├── recommender.js
    ├── recommender.d.ts
    └── *-fetcher.js, *.d.ts
```

## 拡張ポイント

新しい機能を追加する際の拡張ポイント:

1. **新しいツール追加**: `src/tools/index.ts` と `src/index.ts`
2. **新しいデータソース**: `src/services/新-fetcher.ts` と `scripts/fetch-data.ts`
3. **新しい分析ロジック**: `src/services/analyzer.ts`
4. **新しいスコアリング**: `src/services/recommender.ts`
5. **新しい型**: `src/types/index.ts`
