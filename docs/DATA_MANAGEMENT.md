# データ管理

このドキュメントでは、cc-recommenderのデータベース管理について説明します。

---

## 目次

- [ユーザー向け情報](#ユーザー向け情報)
  - [データ更新頻度](#データ更新頻度)
  - [自動更新機能](#自動更新機能)
  - [FAQ](#faq)
- [メンテナー向け情報](#メンテナー向け情報)
  - [更新ワークフロー](#更新ワークフロー)
  - [データソース](#データソース)
  - [手動更新方法](#手動更新方法)
- [技術詳細](#技術詳細)

---

## ユーザー向け情報

### データ更新頻度

cc-recommenderのデータベースは**毎日 AM 9:00 JST**に自動更新されます。

#### 更新内容

- 新しいプラグイン（Anthropic公式マーケットプレイス）
- 新しいMCPサーバー（awesome-mcp-servers）
- 新しいスキル/ワークフロー/フック（awesome-claude-code）
- セキュリティスコアの再計算（新規リポジトリのみ）

### 自動更新機能

cc-recommenderは、ユーザーの操作なしで最新のデータを自動的に取得します。

#### 仕組み

1. **サーバー起動時に最新データを確認**
   - GitHubから最新のJSONファイル（3つ）を確認
   - ETagを使用して変更があるか確認

2. **データが更新されている場合**
   - 自動的に最新版をダウンロード
   - メモリ内のキャッシュを更新

3. **データが更新されていない場合**
   - 既存のキャッシュを継続使用
   - 帯域幅を節約（304 Not Modified）

4. **フォールバック**
   - リモート取得に失敗した場合
   - バンドル版のデータを使用

#### オフラインモード

インターネット接続なしでも動作します：

```bash
# 環境変数でオフラインモードを強制
export CC_RECOMMENDER_OFFLINE_MODE=true

# または設定ファイルで指定
# ~/.claude/config.json
{
  "offlineMode": true
}
```

オフラインモードでは、インストール時にバンドルされたデータを使用します。

### FAQ

#### Q: データはどのくらいの頻度で更新されますか？

A: 毎日 AM 9:00 JST に自動更新されます。新しいプラグイン、MCPサーバー、スキルが追加された場合、翌朝には反映されます。

#### Q: 古いデータを使い続けることはできますか？

A: はい、`CC_RECOMMENDER_OFFLINE_MODE=true` を設定することで、自動更新を無効化できます。ただし、新しいツールが推奨されない可能性があります。

#### Q: 自分のツールをリストに追加したい場合は？

A: 以下のリポジトリに追加してください：

- **プラグイン**: [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- **MCPサーバー**: [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- **スキル**: [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)

追加後、翌日のデータ更新で自動的に反映されます。

#### Q: データ更新時にインターネット接続は必要ですか？

A: いいえ。リモート取得に失敗した場合、自動的にバンドル版にフォールバックします。完全にオフラインでも動作します。

#### Q: セキュリティスコアはどのように計算されますか？

A: [cc-audit](https://github.com/anthropics/cc-audit)を使用して、各GitHubリポジトリをスキャンし、以下の基準でスコアを計算します：

- Critical脆弱性: -25点
- High脆弱性: -10点
- Medium脆弱性: -5点
- Low脆弱性: -2点
- 基礎点: 100点

スコアが高いほど安全です。

---

## メンテナー向け情報

### 更新ワークフロー

データ更新は GitHub Actions で自動化されています。

#### スケジュール

- **自動実行**: 毎日 AM 9:00 JST（UTC 00:00）
- **ワークフロー**: `.github/workflows/update-data.yml`
- **実行時間**: 初回 約60分、2回目以降 約3-10分

#### ワークフローの動作

```
1. GitHub Actions scheduled trigger
   ↓
2. データ取得（並列、約5秒）
   ├─ Plugins: 公式マーケットプレイスから取得
   ├─ MCP: awesome-mcp-serversから取得
   └─ Skills: awesome-claude-codeから取得
   ↓
3. 既存データとの差分チェック
   ↓
4. 新規リポジトリのセキュリティスキャン（並列、約3-60分）
   - 並列数: 10
   - 新規のみスキャン（差分スキャン）
   ↓
5. 3つのJSONファイルに書き出し
   - data/plugins.json
   - data/mcp-servers.json
   - data/skills.json
   ↓
6. 変更があればPR作成
   - ブランチ: update-recommendations-data
   - ラベル: automated, data-update
```

#### パフォーマンス最適化

詳細は [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md) を参照してください。

**主な最適化:**

1. **3ファイル分割** - 並列処理とキャッシュ効率向上
2. **並列実行** - データ取得とスキャンを並列化
3. **差分スキャン** - 新規リポジトリのみスキャン（95%高速化）
4. **並列数増加** - 3→10（3.3倍高速化）
5. **ETagキャッシング** - 帯域幅80-90%削減

**結果:**
- 初回: 約60分
- 2回目以降: 約3-10分（新規リポジトリ数による）

### データソース

#### 1. プラグイン（公式）

- **ソース**: [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- **URL**: `https://raw.githubusercontent.com/anthropics/claude-plugins-official/main/.claude-plugin/marketplace.json`
- **フォーマット**: JSON
- **取得方法**: `src/services/fetchers/plugin-fetcher.ts`

#### 2. MCPサーバー（公式レジストリ）

- **ソース**: [Model Context Protocol Registry](https://registry.modelcontextprotocol.io)
- **URL**: `https://registry.modelcontextprotocol.io/v0.1/servers`
- **フォーマット**: JSON (REST API)
- **取得方法**: `src/services/fetchers/official-mcp-fetcher.ts`
- **特徴**: 公式登録されたMCPサーバー、ページネーション対応

#### 3. MCPサーバー（コミュニティ）

- **ソース**: [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- **URL**: `https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md`
- **フォーマット**: Markdown（パース必要）
- **取得方法**: `src/services/fetchers/mcp-fetcher.ts`

#### 4. スキル/ワークフロー/フック（コミュニティ）

- **ソース**: [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
- **URL**: `https://raw.githubusercontent.com/hesreallyhim/awesome-claude-code/main/THE_RESOURCES_TABLE.csv`
- **フォーマット**: CSV
- **取得方法**: `src/services/fetchers/skill-fetcher.ts`

### 手動更新方法

#### ローカルでデータ更新

```bash
# 通常実行（セキュリティスキャン有効）
pnpm run fetch-data

# セキュリティスキャンをスキップ（高速）
SKIP_SECURITY_SCAN=true pnpm run fetch-data

# 出力先
# - data/plugins.json
# - data/mcp-servers.json
# - data/skills.json
```

#### GitHub Actionsで手動実行

1. GitHubリポジトリの「Actions」タブに移動
2. 「Update Recommendations Database」ワークフローを選択
3. 「Run workflow」ボタンをクリック
4. ブランチを選択（通常は `main`）
5. 「Run workflow」を実行

#### セキュリティスキャンの設定

セキュリティスキャンは時間がかかる場合があります：

```yaml
# .github/workflows/update-data.yml
env:
  SKIP_SECURITY_SCAN: "false"  # スキャン実行
  # SKIP_SECURITY_SCAN: "true"  # スキャンスキップ（高速）
```

**推奨設定:**
- 本番: `"false"` （差分スキャンで効率化済み）
- テスト: `"true"` （高速）

#### タイムアウト設定

```yaml
jobs:
  update-database:
    timeout-minutes: 120  # ジョブ全体

    steps:
      - name: Fetch latest data
        timeout-minutes: 90  # データ取得ステップ
```

初回実行は約60分、2回目以降は数分で完了するため、十分な余裕があります。

### データ形式

#### 出力ファイル

**1. plugins.json**
```json
{
  "version": "0.1.0",
  "lastUpdated": "2025-01-30T12:00:00.000Z",
  "items": [
    {
      "id": "plugin-example",
      "name": "Example Plugin",
      "type": "plugin",
      "url": "https://github.com/...",
      "description": "...",
      "author": { "name": "...", "email": "..." },
      "category": "development",
      "tags": ["development"],
      "detection": {
        "keywords": ["typescript"],
        "languages": ["typescript"]
      },
      "metrics": {
        "source": "official",
        "isOfficial": true,
        "securityScore": 95
      },
      "install": {
        "method": "plugin",
        "command": "/plugin install example",
        "marketplace": "claude-plugins-official"
      }
    }
  ]
}
```

**2. mcp-servers.json** - 同じ構造、`type: "mcp"`

**3. skills.json** - 同じ構造、`type: "skill" | "workflow" | "hook" | "command" | "agent"`

#### 統合データベース

実行時には3ファイルを統合して使用：

```typescript
// src/repositories/recommendation.repository.ts
const [pluginsDb, mcpServersDb, skillsDb] = await Promise.all([
  loadPlugins(),
  loadMCPServers(),
  loadSkills(),
]);

const mergedDatabase: RecommendationDatabase = {
  version: pluginsDb.version,
  lastUpdated: pluginsDb.lastUpdated,
  items: [...pluginsDb.items, ...mcpServersDb.items, ...skillsDb.items],
};
```

### トラブルシューティング

#### ワークフローが失敗する

**原因1: データソースが変更された**
- 対応: フェッチャーのパース処理を修正

**原因2: スキャンがタイムアウトした**
- 対応: 並列数を増やす、またはスキャンをスキップ

**原因3: GitHub API制限**
- 対応: ETag対応により304レスポンスは制限にカウントされない

#### データが更新されない

**確認1: ワークフローの実行状態**
```bash
# GitHub CLIで確認
gh run list --workflow=update-data.yml
```

**確認2: 変更検出**
```bash
# データファイルの最終更新日時を確認
ls -lh data/*.json
```

**確認3: PRが作成されているか**
```bash
# 自動PRを確認
gh pr list --label automated
```

#### データの整合性チェック

```bash
# 各ファイルのアイテム数を確認
jq '.items | length' data/plugins.json
jq '.items | length' data/mcp-servers.json
jq '.items | length' data/skills.json

# 重複チェック
jq -r '.items[].url' data/*.json | sort | uniq -d

# バージョン確認
jq -r '.version' data/*.json
```

---

## 技術詳細

### アーキテクチャ

データ管理は3層アーキテクチャで構成されています：

```
1. データ取得層 (Fetchers)
   ├─ plugin-fetcher.ts
   ├─ mcp-fetcher.ts
   └─ skill-fetcher.ts

2. データ保管層 (Repositories)
   ├─ recommendation.repository.ts (ローカル)
   └─ remote-data.repository.ts (リモート)

3. データ提供層 (Services)
   └─ recommender.ts
```

### パフォーマンス最適化

詳細は [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md) を参照してください。

**実装された最適化:**

| 最適化 | 効果 | 実装箇所 |
|--------|------|----------|
| 3ファイル分割 | 並列処理可能 | `scripts/fetch-data.ts` |
| 並列データ取得 | 3倍高速化 | `scripts/fetch-data.ts` |
| 並列スキャン | 1.5倍高速化 | `scripts/fetch-data.ts` |
| 並列数増加（3→10） | 3.3倍高速化 | `security-scanner.service.ts` |
| 差分スキャン | 95%高速化 | `scripts/fetch-data.ts` |
| ETagキャッシング | 帯域80-90%削減 | `remote-data.repository.ts` |

**総合効果:**

| シナリオ | 最適化前 | 最適化後 | 改善率 |
|---------|---------|---------|--------|
| 初回実行 | 204分 | 61分 | 70%削減 |
| 2回目以降（変更10個） | 204分 | 3分 | 98.5%削減 |
| データ変更なし | 204分 | 35秒 | 99.7%削減 |

### セキュリティスキャン

[cc-audit](https://github.com/anthropics/cc-audit)を使用してリポジトリをスキャン：

```typescript
// src/services/security-scanner.service.ts
export async function scanRepository(
  repoUrl: string,
  scanType: "mcp" | "skill" | "plugin" = "mcp",
): Promise<SecurityScanResult> {
  const command = `npx -y @cc-audit/cc-audit check --remote ${repoUrl} --type ${scanType} --config ${configPath} --format json --ci`;

  const { stdout } = await execAsync(command, {
    timeout: 30000, // 30秒タイムアウト
  });

  const result = JSON.parse(stdout);

  // スコア計算: 100点満点から減点方式
  const deduction =
    findings.critical * 25 +
    findings.high * 10 +
    findings.medium * 5 +
    findings.low * 2;

  const score = Math.max(0, 100 - deduction);

  return { score, findings, success: true };
}
```

**差分スキャン:**

既存のセキュリティスコアを再利用し、新規リポジトリのみスキャン：

```typescript
// 既存データを読み込み
const existingMap = createItemMap(existingItems);

// 新データと比較
for (const item of newItems) {
  const existing = existingMap.get(normalizeUrl(item.url));

  if (existing?.metrics.securityScore !== undefined) {
    // 既存スコアをコピー
    item.metrics.securityScore = existing.metrics.securityScore;
  }
}

// 新規アイテムのみスキャン
const itemsToScan = filterItemsToScan(newItems, existingMap);
await scanItems(itemsToScan, scanType, label);
```

### ETagキャッシング

GitHub RawのETagを活用した効率的なデータ取得：

```typescript
// src/repositories/remote-data.repository.ts
const etagCache = new Map<string, string>();
const dataCache = new Map<string, unknown>();

// リクエスト時
const headers: Record<string, string> = {
  "User-Agent": "cc-recommender",
  "Accept": "application/json",
};

const cachedEtag = etagCache.get(url);
if (cachedEtag) {
  headers["If-None-Match"] = cachedEtag;
}

const response = await fetch(url, { headers });

// 304 Not Modified - キャッシュを返す
if (response.status === 304) {
  return dataCache.get(url);
}

// 200 OK - 新データを取得してETagを更新
const newEtag = response.headers.get("etag");
if (newEtag) {
  etagCache.set(url, newEtag);
  dataCache.set(url, data);
}
```

---

## 関連ドキュメント

- [ARCHITECTURE.md](./ARCHITECTURE.md) - システムアーキテクチャ
- [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md) - パフォーマンス最適化の詳細
- [CONTRIBUTING.md](../CONTRIBUTING.md) - コントリビューションガイド
