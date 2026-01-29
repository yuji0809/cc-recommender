# 技術スタック

## 言語

- **TypeScript 5.5+** - 型安全な開発
- **Node.js 18.0+** - ランタイム環境
- **ES2022** - ターゲットECMAScriptバージョン
- **ESM (ES Modules)** - モジュールシステム（`"type": "module"`）

## メインの依存関係

### プロダクション依存

- **@modelcontextprotocol/sdk ^1.0.0** (現在: 1.25.3) - MCPサーバーフレームワーク
  - `McpServer` - 高レベルMCPサーバー
  - `StdioServerTransport` - stdio経由の通信
- **zod ^3.23.0** - スキーマバリデーション

### 開発依存

- **typescript ^5.5.0** - TypeScriptコンパイラ
- **@types/node ^20.0.0** - Node.js型定義
- **tsx ^4.0.0** - TypeScript実行環境（スクリプト用）
- **@biomejs/biome ^2.3.13** - 高速Linter & Formatter（Rust製）

## パッケージマネージャー

- **pnpm 10.12.3** - 高速で効率的なパッケージマネージャー
  - ディスク容量節約（ハードリンク使用）
  - 厳格な依存関係管理
  - モノレポサポート

## TypeScript設定

- **moduleResolution**: NodeNext（Node.js ESMサポート）
- **strict**: true（厳格な型チェック）
- **target**: ES2022
- **outDir**: `./dist`（ビルド出力）
- **rootDir**: `./src`（ソースルート）
- **declaration**: true（型定義ファイル生成）
- **sourceMap**: true（デバッグ用）

## MCPサーバーアーキテクチャ

```
Claude Code
    ↓ MCP Protocol (stdio)
cc-recommender MCPサーバー
    ├── Analyzer      ... プロジェクトの言語・依存関係・ファイル構造を分析
    ├── Recommender   ... スコア計算して推薦
    └── Database      ... 全ソースを統合したJSON
```

## データ形式

- **JSON** - 静的ファイル（`data/recommendations.json`）
- インメモリデータベース（実行時に読み込み）
