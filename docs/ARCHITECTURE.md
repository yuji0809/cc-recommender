# アーキテクチャ

cc-recommender は stdio で動く MCP サーバーです。コードは 2 つの経路に分かれています。

- サーバー（`src/index.ts` から起動）: 起動時に推薦データベースを読み込み、MCP ツールの呼び出しに応える。
- データ生成（`scripts/fetch-data.ts`）: 外部ソースからプラグイン・MCP サーバー・スキルを集め、セキュリティスキャンをかけて `data/*.json` を書き出す。GitHub Actions（`.github/workflows/update-data.yml`）が毎日 0:00 UTC に実行し、変更を PR にする。

`services/fetchers/` と `services/security-scanner.service.ts` はデータ生成でだけ使い、サーバーの実行中には呼ばれません。例外は `formatters.ts` が使う `getSecurityBadge()` だけです。

データの更新ワークフローは [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md)、スコアの計算は [SCORING.md](./SCORING.md) にまとめています。

## 技術スタック

- TypeScript（ESM、`module: NodeNext`）。`tsc` で `dist/` にビルドする
- Node.js 22 以上（`package.json` の `engines`）。CI は Node 22 と 24 でビルドを確認し、型チェック・Lint・テストは Node 24 で実行する
- ランタイム依存は `@modelcontextprotocol/sdk` 1.32 と `zod` 4 の 2 つだけ
- 開発用: pnpm 10、Vitest 4.1、Biome 2、cc-audit

## ディレクトリ構成

```
src/
├── index.ts                  エントリーポイント。DB を読み込んでサーバーを起動する
├── server/
│   ├── mcp-server.ts         McpServer と stdio トランスポートを作る
│   └── tool-registry.ts      5 つのツールを登録する
├── tools/handlers/           MCP ツールの実装（index.ts が公開 API）
├── schemas/tool-schemas.ts   ツール入力の Zod スキーマ
├── services/
│   ├── analyzer/
│   │   ├── project-analyzer.service.ts
│   │   ├── metadata-analyzer.service.ts
│   │   └── parsers/          マニフェストごとのパーサー（11 個）
│   ├── recommender/
│   │   ├── recommendation.service.ts
│   │   ├── search.service.ts
│   │   ├── quality-scorer.ts
│   │   ├── formatters.ts
│   │   └── scoring/          scorer.ts, context-scorer.ts, similarity-scorer.ts
│   ├── fetchers/             データ生成用（mcp/, plugins/, skills/）
│   └── security-scanner.service.ts
├── repositories/
│   ├── recommendation.repository.ts  DB の読み込みとキャッシュ
│   └── remote-data.repository.ts     GitHub からの最新データ取得
├── config/                   定数、環境変数、マッピング、スコア設定、データソース定義
├── types/                    型定義（index.ts が公開 API）
└── utils/                    glob-matcher.ts, github-url.ts, retry.ts

scripts/fetch-data.ts         データ生成スクリプト（pnpm run fetch-data）
data/                         plugins.json, mcp-servers.json, skills.json（npm パッケージに同梱）
tests/                        Vitest のテスト
```

## レイヤーと依存の向き

サーバー側の呼び出し関係は次のとおりです。

```
src/index.ts
 ├─ repositories/recommendation.repository.ts   起動時に load() を 1 回呼ぶ
 │   └─ repositories/remote-data.repository.ts
 └─ server/mcp-server.ts
     └─ server/tool-registry.ts                 読み込んだ database を各ハンドラーに渡す
         └─ tools/handlers/*.tool.ts
             └─ services/analyzer/, services/recommender/
                 └─ config/, types/, utils/
```

データ生成側は次のとおりです。

```
scripts/fetch-data.ts
 ├─ services/fetchers/plugins/, mcp/, skills/
 ├─ services/security-scanner.service.ts
 ├─ config/constants.ts, config/env.ts
 └─ utils/github-url.ts
 → data/plugins.json, data/mcp-servers.json, data/skills.json
```

依存は上から下への一方向だけにします。tools は services を呼び、services は config・types・utils を使います。config・types・utils・repositories から services や tools を import してはいけません。循環依存は同じ層の中でも作らないでください。

いまの services は repository を import していません。DB は `src/index.ts` が起動時に読み込み、ハンドラーと services には引数で渡しています。新しいサービスで DB が必要な場合も、同じように引数で受け取ってください。

index.ts を置いてよいのは `types/index.ts` と `tools/handlers/index.ts` だけで、ほかは個々のファイルから直接 import します。`types/index.ts` は `scoring-types.ts` を再エクスポートしていないので、スコアリング関連の型は `types/scoring-types.ts` から import します。

## 各ディレクトリ

### server/ と tools/handlers/

`tool-registry.ts` が `server.registerTool()` で 5 つのツールを登録します。`inputSchema` には `schemas/tool-schemas.ts` の Zod スキーマの `.shape` を渡しているので、入力の検証とデフォルト値の適用（`max_results` は 1〜50、既定 20）は SDK がハンドラーを呼ぶ前に済ませます。ハンドラーの戻り値は `JSON.stringify(result, null, 2)` したテキストとして返します。

| ツール | ハンドラー | 処理 |
|---|---|---|
| `recommend_skills` | `recommend-skills.tool.ts` | `analyzeProject()` → `recommend()` → `formatRecommendations()` |
| `search_skills` | `search-skills.tool.ts` | `search()` |
| `get_skill_details` | `get-skill-details.tool.ts` | name か id の完全一致（大文字小文字は無視）で 1 件返す。なければ `Not found: <name>` |
| `list_categories` | `list-categories.tool.ts` | カテゴリごとの件数とタイプを集計し、件数の多い順に返す |
| `get_stats` | `get-stats.tool.ts` | タイプ別・ソース別の件数と公式アイテム数を集計する |

`get_skill_details`、`list_categories`、`get_stats` は services を通さず、ハンドラーの中で database を直接読んでいます。

### services/analyzer/

`analyzeProject(projectPath)` は次の順で `ProjectInfo` を組み立てます。

1. ディレクトリを再帰的に走査する（`config/constants.ts` の `FILE_SCAN_CONFIG`）。ルートから 5 階層下まで降り、`files` には最大 1000 件まで記録する。1000 件を超えても走査は続き、拡張子による言語検出も続く。`SKIP_DIRECTORIES`（node_modules、dist、target、vendor など 15 件）と、名前が `.` で始まるエントリはファイルも含めて飛ばす。
2. 走査中に `config/file-mappings.ts` の `CONFIG_FILE_MAPPINGS`（`next.config.js` → nextjs など）と `EXTENSION_TO_LANGUAGE`（`.ts` → typescript など）で言語とフレームワークを拾う。
3. `parsers/` のパーサーを順に呼ぶ。対象は package.json、requirements.txt、pyproject.toml、go.mod、Cargo.toml、composer.json、Gemfile、pom.xml、build.gradle、`.env.example` などのテンプレート（実際の `.env` は読まない）、docker-compose.yml / compose.yml。
4. languages・dependencies・frameworks の重複を除き、`metadata-analyzer.service.ts` の `analyzeMetadata()` でサイズ・種類・推定チーム規模を出す。これはコンテキストスコアで使う。

パーサーはすべて `(projectPath: string, info: ProjectInfo) => Promise<void>` の形で、`info` に直接書き込みます。ファイルがない、または読めない場合は何もしません。

### services/recommender/

| ファイル | 役割 |
|---|---|
| `recommendation.service.ts` | `recommend()`。全アイテムを採点し、降順に並べて上位 `maxResults` 件を返す |
| `scoring/scorer.ts` | 基本スコア、倍率、正規化（`calculateScore()`）と表示ラベル（`getScoreIndicator()`） |
| `scoring/context-scorer.ts` | プロジェクトのメタデータによる加点 |
| `scoring/similarity-scorer.ts` | タグ共起行列の構築と、類似タグによる加点 |
| `quality-scorer.ts` | 公式かどうか、スター数、更新日、ソースによる品質スコア |
| `search.service.ts` | `search_skills` 用のキーワード検索 |
| `formatters.ts` | `recommend_skills` の `formatted` テキストを作る |

`formatRecommendations()` は結果をタイプ別（plugin、mcp、skill、workflow、hook、command、agent の順）にまとめ、各タイプ 5 件まで表示します。その後に「人気・トレンド」として、まだ表示していないアイテムから最大 2 件を加えます。この候補は `recommend()` を `maxResults: 100, minScore: 0` でもう一度呼んだ結果から選び、公式 +100、スター数 / 10（上限 50）、セキュリティスコア 80 以上で +30、6 か月以内の更新で +20 の合計で並べます。

### services/fetchers/ と security-scanner.service.ts

どちらもデータ生成でだけ使います。

| ファイル | 取得元 |
|---|---|
| `plugins/plugin-fetcher.ts` | anthropics/claude-plugins-official の `.claude-plugin/marketplace.json` |
| `mcp/mcp-fetcher.ts` | punkpeye/awesome-mcp-servers の README.md。各行の絵文字から言語・スコープ・プラットフォーム・公式かどうかを読む |
| `mcp/official-mcp-fetcher.ts` | 公式 MCP Registry の API（`https://registry.modelcontextprotocol.io/v0.1/servers`）。cursor でページングし、status が active のものだけを取る |
| `skills/direct-skill-fetcher.ts` | `config/direct-skill-sources.ts` に並べたリポジトリ（anthropics/skills、openai/skills、vercel-labs/agent-skills など 6 件） |
| `skills/curated-list-fetcher.ts` | `config/curated-list-sources.ts` に並べたリスト（VoltAgent/awesome-agent-skills、ComposioHQ/awesome-claude-skills）の README からリンク先を辿る |

`skills/common/` は 2 つのスキルフェッチャーの共通処理です。`github-api.ts` は GitHub API と raw ファイルの取得（`GITHUB_TOKEN` があれば付け、`utils/retry.ts` でリトライする）、`skill-parser.ts` は SKILL.md などから `Recommendation` を作る処理、`types.ts` は内部型 `RepoMetadata` です。

`security-scanner.service.ts` は `npx -y @cc-audit/cc-audit check --remote <url> ...` を子プロセスで実行し、検出件数から 100 点満点の減点方式（critical −25、high −10、medium −5、low −2）でスコアを出します。スキャンに失敗すると 0 点・`success: false` になり、そのアイテムのスコアは更新されません。

`scripts/fetch-data.ts` の処理は次のとおりです。

1. 既存の `data/*.json` を読み、正規化した URL をキーにしたマップを作る。
2. `FETCH_TYPES`（`plugins` / `mcp` / `skills` のカンマ区切り）で指定された種類を並列に取得する。指定がなければ全種類を取得し、指定外の種類は既存データをそのまま使う。
3. 既存アイテムのセキュリティスコアを引き継ぎ、スコアのない新規アイテムのうち `isGitHubUrl()` が true のものを 10 並列でスキャンする。
4. セキュリティスコアが 70 未満（`SECURITY_CONFIG.minSecurityScore`）のアイテムを除く。スコアのないアイテムは残す。`SKIP_SECURITY_SCAN=true` のときは 3 のスキャンと 4 の除外を行わない。
5. プラグインと MCP サーバーは正規化 URL で重複を除く（同じ URL なら公式を優先）。スキルは重複を除かない。
6. 3 つのファイルに書き出す。

### repositories/

`recommendation.repository.ts` の `load()` は次の順に試します。

1. メモリ上のキャッシュが 1 時間（`CACHE_TTL`）以内ならそれを返す。
2. `CC_RECOMMENDER_OFFLINE_MODE=true` でなければ `fetchRemoteData()` を呼ぶ。
3. リモート取得が `null` を返したら、同梱の `data/` から 3 ファイルを並列に読む。パスはビルド後のファイル位置から `../../data` で解決する。
4. 同梱データも読めなければ、`version: "0.0.0"` の空の DB で起動する。

DB 全体の `version` と `lastUpdated` には plugins.json の値を使います。

`load()` を呼ぶのは起動時の `src/index.ts` だけで、`registerTools()` はそのとき受け取った database を使い続けます。TTL と `reload()` は実装されていますが、サーバーの実行中にデータが入れ替わることはありません。新しいデータを使うには再起動が必要です。

`remote-data.repository.ts` の `fetchRemoteData()` の動作は次のとおりです。

- `https://raw.githubusercontent.com/yuji0809/cc-recommender/main/data/` から `plugins.json`、`mcp-servers.json`、`skills.json` を並列に取得する。1 つでも失敗すれば `null` を返し、全体が同梱データに切り替わる。ファイル単位でリモートと同梱が混ざることはない。
- レスポンスの ETag をモジュール内の Map に保存し、次の取得で `If-None-Match` を付ける。304 が返れば保存済みのデータを使う。このキャッシュはプロセス内だけのもので、起動のたびに全ファイルをダウンロードする。
- Content-Type に `application/json` か `text/plain` が含まれていなければ拒否する。raw.githubusercontent.com は `text/plain` で返す。
- タイムアウトはファイルごとに 15 秒で、レスポンス本文のダウンロード完了までを含む。
- 検証では、`version` と `lastUpdated` が文字列、`items` が配列、全体が 50MB 以下、アイテム数が 50,000 件以下であることを確認する。各アイテムには文字列の `id`・`name`・`type` が必要で、`type` はファイルに合っていなければならない（plugins は `plugin`、mcp-servers は `mcp`、skills は `skill` / `workflow` / `hook` / `command` / `agent`）。1 アイテムは 100KB 以下。サイズはパース後のデータを `JSON.stringify()` した文字列の長さで測る。2026-05-29 生成のデータでは、件数が最も多いのは skills.json の 9,429 件。

`fetchRemoteData()` に URL を渡すと、旧形式の単一ファイルとして取得します。後方互換のためのもので、サーバーからは使っておらず、テストだけが使っています。

### config/

| ファイル | 内容 |
|---|---|
| `constants.ts` | `FILE_SCAN_CONFIG`、`SKIP_DIRECTORIES`、`APP_METADATA`、`SECURITY_CONFIG`（70 点未満を除外、未スキャンは残す） |
| `env.ts` | 環境変数をモジュール読み込み時に 1 回だけ読み、`ENV` として公開する（`GITHUB_TOKEN`、`SKIP_SECURITY_SCAN`、`CC_RECOMMENDER_OFFLINE_MODE`、`FETCH_TYPES`） |
| `file-mappings.ts` | `CONFIG_FILE_MAPPINGS`（設定ファイル名から言語・フレームワーク）、`EXTENSION_TO_LANGUAGE` |
| `scoring-config.ts` | 基本スコアの重み、倍率、閾値 |
| `enhanced-scoring-config.ts` | コンテキストスコアの重み、プロジェクトサイズの閾値、類似性の閾値、有効化フラグ |
| `direct-skill-sources.ts` | スキルを直接持つリポジトリの一覧と、探すディレクトリ名・ファイル名 |
| `curated-list-sources.ts` | スキルへのリンク集を README に持つリポジトリの一覧 |

環境変数は `process.env` を直接読まず、`ENV` を通して使います。

### types/

| ファイル | 内容 |
|---|---|
| `index.ts` | domain・raw・service の型を再エクスポートする公開 API |
| `domain-types.ts` | `Recommendation`、`RecommendationDatabase`、`PluginDatabase` などのドメイン型 |
| `service-types.ts` | `ProjectInfo`、`ScoredRecommendation` |
| `scoring-types.ts` | `ProjectMetadata`、`SimilarityMatrix`、`ScoreBreakdown`（`index.ts` からは出していない） |
| `raw-types.ts` | 外部ソースの生データの型（`RawPluginEntry`、`RawMCPEntry`、`RawSkillEntry`） |

型は `interface` ではなく `type` で定義します。

### utils/

- `glob-matcher.ts` の `matchGlob()` は `*`、`**`、`?` を正規表現に変換し、大文字小文字を区別せずに照合する。スコアリングのファイルパターン一致で使う。
- `github-url.ts` の `isGitHubUrl()` は URL をパースし、プロトコルが https でホスト名が `github.com` と完全に一致するときだけ true を返す。部分一致だと `github.com.evil.example` のようなホストを通してしまうため。`scripts/fetch-data.ts` がスキャン対象を選ぶときに使う。
- `retry.ts` の `retryWithBackoff()` は指数バックオフでリトライする（既定は最大 3 回、1 秒から 2 倍ずつ、上限 10 秒）。一時的なエラーとレート制限を判定する関数もここにある。

## recommend_skills の処理の流れ

```
1. SDK が recommendSkillsSchema で入力を検証する
2. recommendSkills(input, database)
3. analyzeProject(project_path)                         → ProjectInfo（metadata 付き）
4. recommend(database, info, description, { maxResults: max_results, types })
     タグ共起行列を作る → 全アイテムを calculateScore() と品質スコアで採点
     → 降順ソート → 上位 N 件
5. recommend(..., { maxResults: 100, minScore: 0, types })   「人気・トレンド」の候補
6. formatRecommendations(4 の結果, 5 の結果)
7. { project, recommendations, formatted, totalFound } を JSON テキストで返す
```

`recommend()` は呼ばれるたびに DB 全体からタグ共起行列を作り直すので、`recommend_skills` 1 回につき 2 回作ります。スコアによる足切りは実質的になく（SCORING.md 参照）、全アイテムを採点してからソートして切り詰めます。

## エラー処理

例外はなるべくその層で吸収し、サーバーを止めないようにしています。

- ツール入力の誤りは SDK が Zod スキーマで弾く。
- パーサーは、ファイルがない場合や壊れている場合を `catch {}` で無視する。
- `analyzeProject()` は走査中の例外をログに出し、そこまでの結果を返す。メタデータの算出に失敗した場合は `metadata` なしで続けるので、コンテキストスコアは付かない。
- リモート取得の失敗はすべて `null` になり、同梱データに切り替わる。同梱データも読めなければ空の DB で起動する。
- フェッチャーは失敗したソースをログに出して空として扱い、データ生成を続ける。
- 起動処理（`src/index.ts`）で例外が出た場合は終了コード 1 で終わる。

## テスト

`vitest.config.ts` は `**/*.test.ts` を対象にし、カバレッジから `scripts/` を除いています。

| ディレクトリ | 対象 |
|---|---|
| `tests/analyzer/` | `analyzeProject()` とパーサー。`integration.test.ts` はこのリポジトリ自体を分析する |
| `tests/fetchers/` | 各フェッチャー。`fetch` や `skills/common/` をモックし、ネットワークには出ない |
| `tests/recommender/` | scorer、quality-scorer、search、formatters |
| `tests/repositories/` | remote-data.repository（Content-Type、タイムアウト、検証の上限） |
| `tests/services/analyzer/` | metadata-analyzer |
| `tests/services/recommender/scoring/` | context-scorer、similarity-scorer |
| `tests/utils/` | github-url |

テストの置き場所は、`src/` の階層に合わせたもの（`tests/services/...`）と、平たく置いたもの（`tests/recommender/` など）が混在しています。

## 拡張するとき

手順は CLAUDE.md の「新機能追加ガイドライン」にあります。ここではつなぎ込みが必要な箇所だけを挙げます。

- パーサーを追加する場合は `services/analyzer/parsers/<name>.parser.ts` を作り、`project-analyzer.service.ts` の `analyzeProject()` から呼ぶ。設定ファイル名や拡張子で言語を判定するなら `config/file-mappings.ts` にも追加する。
- ツールを追加する場合は `schemas/tool-schemas.ts` にスキーマ、`tools/handlers/<name>.tool.ts` にハンドラーを作り、`tools/handlers/index.ts` から export して `server/tool-registry.ts` で `registerTool()` する。DB が必要なら引数で受け取る。
- スキルのソースを追加するだけなら、`config/direct-skill-sources.ts` か `config/curated-list-sources.ts` に 1 件足せば済むことが多い。
- 新しい種類のデータソースを追加する場合は `services/fetchers/<kind>/` にフェッチャーを作り、`scripts/fetch-data.ts` から呼ぶ。サーバー側の変更は要らない。
