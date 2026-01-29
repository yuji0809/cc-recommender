# cc-recommender

[![npm version](https://img.shields.io/npm/v/cc-recommender.svg)](https://www.npmjs.com/package/cc-recommender)
[![CI](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml/badge.svg)](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yuji0809/cc-recommender/branch/main/graph/badge.svg)](https://codecov.io/gh/yuji0809/cc-recommender)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10.0.0-orange.svg)](https://pnpm.io/)

> 🎯 Claude Code向けスキル/プラグイン/MCPサーバー推薦MCPサーバー

[English](./README.md) | 日本語

Claude Codeで「何入れたらいい？」と聞くだけで、プロジェクトを分析し、最適なスキル・プラグイン・MCPサーバーを提案します。

## 特徴

- 📦 **プラグイン推薦** - 公式マーケットプレイスから最適なプラグインを提案
- 🔌 **MCPサーバー推薦** - awesome-mcp-serversから500+のMCPサーバーを検索
- 🎯 **スキル/ワークフロー推薦** - awesome-claude-codeからスキル、フック、コマンドを提案
- 🔍 **プロジェクト分析** - 使用言語、フレームワーク、依存関係を自動検出
- 🏷️ **キーワード検索** - 名前やタグで検索

## インストール

### npm経由（推奨）

```bash
npm install -g cc-recommender
```

### ローカルビルド

```bash
git clone https://github.com/yuji0809/cc-recommender.git
cd cc-recommender
pnpm install
pnpm run build
```

**要件:**
- Node.js >= 22.0.0
- pnpm >= 10.0.0

## Claude Codeで使う

`~/.claude/settings.json` に追加:

```json
{
  "mcpServers": {
    "cc-recommender": {
      "command": "npx",
      "args": ["-y", "cc-recommender"]
    }
  }
}
```

またはローカルビルドの場合:

```json
{
  "mcpServers": {
    "cc-recommender": {
      "command": "node",
      "args": ["/path/to/cc-recommender/dist/index.js"]
    }
  }
}
```

## 使い方

### プロジェクト分析と推薦

```
You: このプロジェクトに何を入れたらいい？

Claude: [recommend_skills ツールを使用]

📦 プラグイン
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. typescript-lsp (公式)
   ├─ 用途: TypeScript の定義ジャンプ、型チェック
   ├─ スコア: 95 ✅ 高適合
   └─ インストール: /plugin install typescript-lsp

🔌 MCPサーバー
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. supabase-mcp
   ├─ 用途: Supabase DB 操作
   ├─ 推薦理由: @supabase/supabase-js 依存
   └─ インストール: claude mcp add supabase-mcp
```

### キーワード検索

```
You: データベース関連のMCPを探して

Claude: [search_skills ツールを使用]
```

## 提供ツール

| ツール | 説明 |
|--------|------|
| `recommend_skills` | プロジェクトを分析し、適切なスキル/プラグイン/MCPを推薦 |
| `search_skills` | キーワードで検索 |
| `get_skill_details` | 特定アイテムの詳細を取得 |
| `list_categories` | カテゴリ一覧を取得 |
| `get_stats` | データベース統計を取得 |

## データソース

| ソース | 内容 |
|--------|------|
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | 公式プラグインマーケットプレイス |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | MCPサーバーのキュレーションリスト |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | スキル/ワークフロー/フックのリスト |

## 開発

### セットアップ

```bash
# 依存関係インストール
pnpm install

# Huskyのセットアップ（初回のみ）
pnpm run prepare
```

### コード品質

このプロジェクトでは **Biome** を使用してコード品質を管理しています。

```bash
# Lint + Format チェック
pnpm run lint

# 自動修正
pnpm run lint:fix

# フォーマットのみ
pnpm run format

# 型チェック
pnpm run typecheck

# すべてのチェック
pnpm run check
```

### Git Hooks (Husky)

コミット時に自動的に以下が実行されます：

1. **lint-staged** - 変更されたファイルのみを Biome でチェック＆フォーマット
2. **型チェック** - TypeScript の型エラーがないか確認

コミットが失敗した場合は、エラーを修正してから再度コミットしてください。

```bash
# エラー修正後
pnpm run lint:fix
git add .
git commit -m "fix: ..."
```

### データベース更新

```bash
pnpm run fetch-data
```

### テスト

```bash
# テスト実行
pnpm run test

# テスト監視モード
pnpm run test:watch

# カバレッジ
pnpm run test:coverage
```

### ビルド

```bash
pnpm run build
```

## ディレクトリ構造

```
cc-recommender/
├── src/
│   ├── index.ts              # MCPサーバーエントリーポイント
│   ├── tools/
│   │   └── index.ts          # ツール定義
│   ├── services/
│   │   ├── analyzer.ts       # プロジェクト分析
│   │   ├── recommender.ts    # 推薦ロジック
│   │   ├── plugin-fetcher.ts # プラグイン取得
│   │   ├── mcp-fetcher.ts    # MCPサーバー取得
│   │   └── skill-fetcher.ts  # スキル取得
│   └── types/
│       └── index.ts          # 型定義
├── data/
│   └── recommendations.json  # 統合データベース
├── scripts/
│   └── fetch-data.ts         # データ取得スクリプト
├── tests/
│   ├── analyzer.test.ts      # 分析のテスト
│   └── recommender.test.ts   # 推薦のテスト
├── package.json
├── tsconfig.json
└── README.md
```

## ライセンス

MIT

## 作者

Yuji
