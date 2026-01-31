# cc-recommender

[![npm version](https://img.shields.io/npm/v/cc-recommender.svg)](https://www.npmjs.com/package/cc-recommender)
[![npm downloads](https://img.shields.io/npm/dm/cc-recommender.svg)](https://www.npmjs.com/package/cc-recommender)
[![CI](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml/badge.svg)](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yuji0809/cc-recommender/branch/main/graph/badge.svg)](https://codecov.io/gh/yuji0809/cc-recommender)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

> 🎯 Claude Code向けスキル/プラグイン/MCPサーバー推薦MCPサーバー

[English](./README.md) | 日本語

Claude Codeで「何入れたらいい？」と聞くだけで、プロジェクトを分析し、最適なスキル・プラグイン・MCPサーバーを提案します。

## 特徴

- 📦 **プラグイン推薦** - 公式マーケットプレイスから最適なプラグインを提案
- 🔌 **MCPサーバー推薦** - awesome-mcp-serversからMCPサーバーを検索
- 🎯 **スキル/ワークフロー推薦** - awesome-claude-codeからスキル、フック、コマンドを提案
- 🔍 **プロジェクト分析** - 使用言語、フレームワーク、依存関係を自動検出
- 🏷️ **キーワード検索** - 名前やタグで検索
- 🔄 **自動更新** - GitHubから常に最新データを取得（手動更新不要）

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
- pnpm >= 10.0.0（ローカルビルドの場合）

## Claude Codeで使う

**Cursorユーザーの方へ:** `~/.claude/settings.json`の代わりに`~/.cursor/mcp.json`を使用してください

### 方法1: npx経由（推奨）

インストール不要。常に最新版を使用。

`~/.claude/settings.json`（Cursorの場合は`~/.cursor/mcp.json`）に追加:

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

### 方法2: グローバルインストール

起動が速く、オフラインでも動作。手動更新が必要。

```bash
npm install -g cc-recommender
```

`~/.claude/settings.json` に追加:

```json
{
  "mcpServers": {
    "cc-recommender": {
      "command": "cc-recommender"
    }
  }
}
```

### 方法3: ローカルビルド（開発者向け）

```bash
git clone https://github.com/yuji0809/cc-recommender.git
cd cc-recommender
pnpm install
pnpm run build
```

`~/.claude/settings.json` に追加:

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

このMCPサーバーは、以下のソースからデータを集約しています:

| ソース | 内容 | 更新頻度 |
|--------|------|---------|
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | 公式プラグインマーケットプレイス | 日次 |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | MCPサーバーのキュレーションリスト | 日次 |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | スキル/ワークフロー/フックのリスト | 日次 |

### 自動更新機能

**仕組み:**
- サーバー起動時にGitHubから最新データを自動取得
- リモート取得に失敗した場合はバンドル版データにフォールバック
- 手動更新や再インストール不要

**オフラインモード**（オプション）:
```json
{
  "mcpServers": {
    "cc-recommender": {
      "command": "npx",
      "args": ["-y", "cc-recommender"],
      "env": {
        "CC_RECOMMENDER_OFFLINE_MODE": "true"
      }
    }
  }
}
```

`CC_RECOMMENDER_OFFLINE_MODE` を有効にすると、バンドル版データのみを使用します（リモート取得なし）。

### 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `CC_RECOMMENDER_OFFLINE_MODE` | 自動更新を無効化してバンドル版データのみを使用 | `false` |
| `SKIP_SECURITY_SCAN` | データ取得時にセキュリティスキャンをスキップ（開発者向け） | `false` |

## 開発

開発セットアップと貢献ガイドラインについては、以下を参照してください:
- [CONTRIBUTING.md](./CONTRIBUTING.md) - 貢献ガイド
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - アーキテクチャドキュメント

### 開発者向けクイックスタート

```bash
# 依存関係インストール
pnpm install

# テスト実行
pnpm run test

# 型チェック + Lint + セキュリティ監査
pnpm run check

# ビルド
pnpm run build
```

## セキュリティ

このプロジェクトではセキュリティを最優先事項としており、複数の自動化されたセキュリティ対策を実施しています：

- **自動スキャン**: Dependabot、CodeQL、カスタムセキュリティ監査
- **プリコミット保護**: コミット前にセキュリティチェックを実行
- **CI/CD ゲート**: すべての PR はセキュリティスキャンに合格する必要あり
- **ライセンス準拠**: すべての依存関係が承認されたライセンスであることを検証

詳細は [SECURITY.md](./SECURITY.md) を参照してください。

セキュリティ脆弱性を報告する場合は、[GitHub Security Advisories](https://github.com/yuji0809/cc-recommender/security/advisories) をご利用ください。

## コントリビューション

貢献を歓迎します！詳細は [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## ライセンス

[MIT](https://opensource.org/licenses/MIT)

## 作者

Yuji
