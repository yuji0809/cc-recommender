# cc-recommender

[![npm version](https://img.shields.io/npm/v/cc-recommender.svg)](https://www.npmjs.com/package/cc-recommender)
[![npm downloads](https://img.shields.io/npm/dt/cc-recommender.svg)](https://www.npmjs.com/package/cc-recommender)
[![CI](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml/badge.svg)](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yuji0809/cc-recommender/branch/main/graph/badge.svg)](https://codecov.io/gh/yuji0809/cc-recommender)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

[English](./README.md) | 日本語

作業中のプロジェクトに合った Claude Code のプラグイン、MCP サーバー、スキルを提案する MCP サーバーです。

Claude Code で「このプロジェクトに何を入れたらいい？」のように聞くと、プロジェクトのマニフェストファイルから言語・フレームワーク・依存関係を読み取り、約 19,000 件（2026 年 11 月時点）のデータベースから合うものを返します。

## セットアップ

Node.js 22 以上が必要です。

### Claude Code

```bash
claude mcp add --scope user cc-recommender -- npx -y cc-recommender
```

`--scope user` を付けると、すべてのプロジェクトで使えます。接続できているかは `claude mcp list` で確認できます。

チームで設定を共有したい場合は、プロジェクト直下の `.mcp.json` に書きます。

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

### Cursor などほかの MCP クライアント

クライアントの MCP 設定ファイル（Cursor なら `~/.cursor/mcp.json`）に、同じ `mcpServers` の設定を書きます。

### グローバルインストール

起動のたびに `npx` を経由したくない場合は、グローバルにインストールします。

```bash
npm install -g cc-recommender
claude mcp add --scope user cc-recommender -- cc-recommender
```

更新は `npm update -g cc-recommender` で行います。

## 使い方

普段の言葉で聞けば、Claude が適切なツールを選びます。

- 「このプロジェクトに何を入れたらいい？」
- 「PostgreSQL 向けの MCP サーバーを探して」
- 「このリポジトリのテストに使えるスキルだけ教えて」
- 「playwright-skill の詳細を教えて」

| ツール | 内容 | パラメータ |
|--------|------|------------|
| `recommend_skills` | プロジェクトを解析して、合うものを推薦する | `project_path`（必須）、`description`、`types`、`max_results`（1〜50、既定 20） |
| `search_skills` | 全件をキーワードで検索する | `query`（必須）、`types`、`max_results` |
| `get_skill_details` | 1 件の詳細を表示する | `name`（必須） |
| `list_categories` | カテゴリの一覧を表示する | なし |
| `get_stats` | データベースの統計を表示する | なし |

`types` には `plugin`、`mcp`、`skill`、`workflow`、`hook`、`command`、`agent` を指定でき、結果をその種類に絞り込めます。

プロジェクト解析で読むのは、`package.json`、`requirements.txt`、`pyproject.toml`、`go.mod`、`Cargo.toml`、`composer.json`、`Gemfile`、`pom.xml`、`build.gradle`、`docker-compose.yml`、`.env` です。あわせて、フレームワークの設定ファイル（Next.js、Nuxt、Vite、Prisma など）とファイルの拡張子も見ます。

## データ

| 種類 | 取得元 |
|------|--------|
| プラグイン | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) |
| MCP サーバー | [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)、[公式 MCP Registry](https://registry.modelcontextprotocol.io) |
| スキル | [anthropics/skills](https://github.com/anthropics/skills)、[openai/skills](https://github.com/openai/skills)、[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)、[supabase/agent-skills](https://github.com/supabase/agent-skills)、[obra/superpowers](https://github.com/obra/superpowers)、[lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill)、およびリスト [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)、[ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) |

データベースは GitHub Actions で毎日作り直し、結果を pull request として作成しています。

サーバーは起動時に、このリポジトリから最新のデータベースをダウンロードします。ダウンロードに失敗した場合や、データが検証を通らなかった場合は npm パッケージに同梱されたデータを使うので、オフラインでも動きます。常に同梱データを使いたい場合は `CC_RECOMMENDER_OFFLINE_MODE` を設定します。

```bash
claude mcp add --scope user cc-recommender -e CC_RECOMMENDER_OFFLINE_MODE=true -- npx -y cc-recommender
```

| 環境変数 | 説明 | 既定値 |
|----------|------|--------|
| `CC_RECOMMENDER_OFFLINE_MODE` | リモートからのダウンロードをせず、同梱データだけを使う | `false` |

## 開発

pnpm 10 が必要です。

```bash
git clone https://github.com/yuji0809/cc-recommender.git
cd cc-recommender
pnpm install
pnpm run build
pnpm run test
pnpm run check   # 型チェック、lint、cc-audit、ライセンスチェック
```

ローカルでビルドしたものを Claude Code で試すときは、コマンドに `node /path/to/cc-recommender/dist/index.js` を登録します。

開発の流れは [CONTRIBUTING.md](./CONTRIBUTING.md)、コードの構成は [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)、データベースの作り方は [docs/DATA_MANAGEMENT.md](./docs/DATA_MANAGEMENT.md) を参照してください。

## セキュリティ

脆弱性の報告方法と、依存関係・CI・npm リリースを守るための仕組みは [SECURITY.md](./SECURITY.md) にまとめています。

## ライセンス

[MIT](./LICENSE)
