# データ管理

推薦に使うデータをどう作り、どう配り、実行時にどう読むかをまとめる。対象は `data/` にある 3 つの JSON ファイル。

## データファイル

| ファイル | 中身 | `type` |
|---|---|---|
| `data/plugins.json` | Claude Code プラグイン | `plugin` |
| `data/mcp-servers.json` | MCP サーバー | `mcp` |
| `data/skills.json` | スキル | `skill` |

3 ファイルとも `{ version, lastUpdated, items }` の形をしている。`version` は `scripts/fetch-data.ts` で `"0.1.0"` に固定されていて、`lastUpdated` は fetch-data を実行した時刻（3 ファイルで同じ値）になる。`RecommendationType` には `workflow` / `hook` / `command` / `agent` も定義されているが、今のフェッチャーが skills.json に書くのは `skill` だけ。

2026-11-03 時点で main にあるデータは 2026-05-29 の自動更新で作られたもので、件数はプラグイン 142、MCP サーバー 9,305、スキル 9,429。

アイテムは次のような形をしている（plugins.json の 1 件）。

```json
{
  "id": "plugin-adobe-for-creativity",
  "name": "adobe-for-creativity",
  "type": "plugin",
  "url": "https://github.com/adobe/skills/tree/main/plugins/creative-cloud/adobe-for-creativity",
  "description": "Harness Adobe's creative AI-powered tools to edit images, ...",
  "author": { "name": "Adobe" },
  "category": "design",
  "tags": ["design"],
  "detection": { "keywords": ["design"] },
  "metrics": { "source": "community", "isOfficial": false, "securityScore": 100 },
  "install": {
    "method": "plugin",
    "command": "/plugin install adobe-for-creativity",
    "marketplace": "claude-plugins-official"
  }
}
```

## データソース

フェッチャーは `src/services/fetchers/` にある。

### プラグイン

[anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) の `.claude-plugin/marketplace.json` を raw.githubusercontent.com から取得する（`plugins/plugin-fetcher.ts`）。`url` には `homepage` があればそれを使い、なければ `source` から作った URL を使う。作者名に "anthropic" を含むものを公式として扱う。

### MCP サーバー

次の 2 つを並列に取得し、正規化した URL で重複を除く。同じ URL があれば公式（`isOfficial: true`）のほうを残す。

- [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) の README.md（`mcp/mcp-fetcher.ts`）。github.com へのリンクだけを拾い、見出しからカテゴリを、各行の絵文字から言語やスコープを読み取る。
- 公式 MCP Registry の `https://registry.modelcontextprotocol.io/v0.1/servers`（`mcp/official-mcp-fetcher.ts`）。`version=latest` を指定してカーソルでページをたどり、`status` が `active` のものだけを使う。

### スキル

直接スキルを取得するリポジトリが 6 つ（`src/config/direct-skill-sources.ts`）。

- vercel-labs/agent-skills
- anthropics/skills
- openai/skills
- obra/superpowers
- supabase/agent-skills
- lackeyjb/playwright-skill

各リポジトリの `skills/` を見て、見つからなければ `.claude/skills/` を見る（`skills/direct-skill-fetcher.ts`）。サブディレクトリの一覧は GitHub Contents API で取り、失敗したらそのディレクトリの README.md のリンクから拾い、それも駄目なら `KNOWN_SKILLS_BY_REPO` に書いてある名前を使う。`SKILL.md` / `skill.md` / `README.md` / `CLAUDE.md` のどれかがあるディレクトリをスキルとして扱う。

ほかに、キュレーションリストが 2 つある（`src/config/curated-list-sources.ts`）。

- VoltAgent/awesome-agent-skills
- ComposioHQ/awesome-claude-skills

README から github.com へのリンクを抜き出し、リンク先がスキルのリポジトリかどうかを確かめてから取り込む（`skills/curated-list-fetcher.ts`）。`skills/README.md` か `.claude/skills/README.md` がある、またはルートの `skill.md` / `SKILL.md` / `README.md` に "skill" という文字列が含まれていれば、スキルのリポジトリとみなす。取り込むときは `.claude/skills/` か `skills/` の下を一覧し、どちらもなければ `skill/` かルートを 1 つのスキルとして読む。

ファイルは raw.githubusercontent.com の `main` ブランチから読むので、デフォルトブランチが `main` 以外のリポジトリのスキルは取り込めない。

スキルは重複排除をしない。正規化 URL は `/tree/main/...` 以降を落とすため、重複排除すると同じリポジトリのスキルが 1 件にまとまってしまう。

以前ソースにしていた hesreallyhim/awesome-claude-code は、今は使っていない。

## データの生成

`scripts/fetch-data.ts` がすべてのソースを取得し、`data/` の 3 ファイルを書き出す。

```bash
pnpm run fetch-data          # 全種類を取得してスキャンする
pnpm run fetch-data:quick    # スキャンを省く（SKIP_SECURITY_SCAN=true）
pnpm run fetch-data:full     # SKIP_SECURITY_SCAN=false を明示する。中身は fetch-data と同じ
pnpm run fetch-data:plugins  # FETCH_TYPES=plugins
pnpm run fetch-data:mcp      # FETCH_TYPES=mcp
pnpm run fetch-data:skills   # FETCH_TYPES=skills
```

処理の順番は次のとおり。

1. 既存の `data/*.json` を読み、正規化 URL をキーにしたマップを作る。ファイルがない、または読めないときは空として扱う。
2. プラグイン、MCP サーバー、スキルの取得とスキャンを、種類ごとに並列で実行する。
3. 既存アイテムにセキュリティスコアがあれば新しいアイテムにコピーし、スコアのないものだけをスキャンする。
4. スキャンを省いていなければ、スコアが `SECURITY_CONFIG.minSecurityScore`（70）未満のアイテムを除く。
5. プラグインと MCP サーバーは正規化 URL で重複を除く（公式を優先）。
6. 3 ファイルを書き出す。

URL の正規化（`normalizeUrl`）では、小文字にしたうえで、プロトコル、末尾の `/` と `.git`、`/tree/main` と `/blob/main` 以降を取り除く。スキルの URL には `/tree/main/<path>` が付いているので、スコアの引き継ぎは実質リポジトリ単位になる。

`FETCH_TYPES` で対象から外した種類は、既存ファイルのアイテムをそのまま書き戻す。ただし `lastUpdated` は 3 ファイルとも書き換わる。

取得に失敗したソースは、エラーをログに出したうえで空配列として扱われ、その結果がそのままファイルに書かれる。プラグインの取得が落ちれば plugins.json は 0 件になり、MCP の片方のソースが落ちればその分だけ件数が減る。自動 PR をマージする前に件数を確認すること（後述）。

### 環境変数

`src/config/env.ts` で読み込む。

| 変数 | 内容 |
|---|---|
| `SKIP_SECURITY_SCAN` | `"true"` のときだけスキャンを省く。省いた場合はスコアによる除外も行わない。既存スコアのコピーは行う |
| `FETCH_TYPES` | 取得する種類をカンマ区切りで指定する（`plugins` / `mcp` / `skills`）。未設定か、有効な値がひとつもなければ全種類 |
| `SECURITY_SCAN_TIME_LIMIT_MINUTES` | fetch-data の開始からこの分数を過ぎたら、新しいスキャンのバッチを始めない。残りはスコアなしのまま残り、次の実行でスキャンされる。正の整数だけが有効で、未設定なら上限なし |
| `GITHUB_TOKEN` | GitHub Contents API の認証に使う。未設定だと 1 時間 60 回の制限に当たりやすく、スキル一覧の取得が README や既知リストへのフォールバックになる。cc-audit も `--remote` の認証にこの変数を読む |

cc-audit の設定ファイルはカレントディレクトリの `.cc-audit.yaml` を使うので、fetch-data はリポジトリのルートで実行する（`pnpm run` 経由なら問題ない）。

### セキュリティスキャン

`src/services/security-scanner.service.ts` の `scanRepository` が、リポジトリごとに [cc-audit](https://github.com/ryo-ebata/cc-audit) を実行する。引数はシェルエスケープしてあり、タイムアウトは 30 秒。

```bash
npx -y @cc-audit/cc-audit check --remote <repoUrl> --type <mcp|skill|plugin> \
  --config "$PWD/.cc-audit.yaml" --format json --ci
```

JSON 出力の `summary` にある件数から、次の式で 0〜100 のスコアを出す。

```
score = max(0, 100 - (critical * 25 + high * 10 + medium * 5 + low * 2))
```

スキャンの対象は `https://github.com/` の URL だけで、それ以外のアイテムはスコアなしで残る。並列数は 10 で、3 種類が同時に走る（詳しくは [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md)）。

スキャンが失敗したとき（タイムアウト、cc-audit が 0 以外で終了した、JSON をパースできなかった、など）はスコアを付けない。`SECURITY_CONFIG.excludeUnscored` が `false` なので、スコアのないアイテムは除外されずに残り、次の実行でまたスキャン対象になる。

一度スコアが付いたリポジトリは再スキャンしない。付け直したいときは、`data/*.json` の該当アイテムから `metrics.securityScore` を消してから実行する。

2026-11-03 時点の `data/` では、スコアが付いているアイテムはすべて 100 点で、70〜99 点のものは 1 件もない。原因はまだ調べていない。

## 自動更新（GitHub Actions）

`.github/workflows/update-data.yml` で毎日データを作り直す。

- 毎日 00:00 UTC（09:00 JST）に schedule で起動する。GitHub 側の混雑で開始が遅れることがある。手動実行は Actions タブか `gh workflow run update-data.yml` で行う。
- Node 24 で `pnpm install --frozen-lockfile` を実行したあと、`pnpm run fetch-data` を実行する。`SKIP_SECURITY_SCAN` は `"false"`、`SECURITY_SCAN_TIME_LIMIT_MINUTES` は `"70"` で、`GITHUB_TOKEN` にはワークフローのトークンを渡す。
- fetch-data の前に、未マージの `update-recommendations-data` ブランチがあれば、その `data/` を作業ツリーに取り出して増分スキャンの基準にする。index は main のまま戻すので、変更があるかどうかは main との差分で判定する。PR がマージされない間も前回までのスコアを使い回せる。
- タイムアウトは fetch-data のステップが 90 分、ジョブ全体が 120 分。
- `data/*.json` に差分があれば、peter-evans/create-pull-request が `update-recommendations-data` ブランチで PR を作る。PR がすでにあれば同じブランチを更新する。ラベルは `automated` と `data-update`。
- 使うアクションのバージョンは `.github/workflows/actions.lock`（`gh actions-lock` で生成）で固定している。

利用者に新しいデータが届くのは、この PR を main にマージしたとき。cc-recommender は起動時に main の `data/` を取りに行くので、npm のリリースは要らない。npm パッケージに同梱するデータ（`package.json` の `files` に `data` が入っている）は、次のリリースまで変わらない。

公開リポジトリの schedule ワークフローは、リポジトリに 60 日間動きがないと GitHub に無効化される。このワークフローも一度無効になっていて、2026-11-03 に有効に戻した。状態は `gh workflow view update-data.yml` で確認でき、無効になっていれば `gh workflow enable update-data.yml` で戻せる。

## 実行時の読み込み

cc-recommender は起動時に一度だけ `RecommendationRepository.load()`（`src/repositories/recommendation.repository.ts`）を呼ぶ。

`CC_RECOMMENDER_OFFLINE_MODE` が `"true"` でなければ、`src/repositories/remote-data.repository.ts` が次の 3 ファイルを並列に取得する。

```
https://raw.githubusercontent.com/yuji0809/cc-recommender/main/data/plugins.json
https://raw.githubusercontent.com/yuji0809/cc-recommender/main/data/mcp-servers.json
https://raw.githubusercontent.com/yuji0809/cc-recommender/main/data/skills.json
```

3 つとも取得と検証に成功すればそれを使う。1 つでも失敗したら、3 ファイルともパッケージに同梱した `data/` から読む。

1 回のリクエストごとに、次の条件を見ている。

- タイムアウトは 15 秒で、本文のダウンロードが終わるまでを含む。
- `Content-Type` は `application/json` か `text/plain` を受け付ける。raw.githubusercontent.com は `text/plain` で返してくる。
- 中身の検証として、`version` と `lastUpdated` が文字列であること、`items` が配列であること、件数が 50,000 以下、JSON 全体が 50MB 以下、1 アイテムが 100KB 以下であること、各アイテムに `id` / `name` / `type` があり、`type` がそのファイルで許される値であることを確認する。

v0.9.1 より前は `text/plain` のレスポンスを弾いていたので、リモートのデータは読み込まれず、常に同梱データが使われていた（[#47](https://github.com/yuji0809/cc-recommender/issues/47)）。

ETag を使った条件付きリクエスト（`If-None-Match` を付け、304 ならメモリ上のデータを返す）は実装してある。ただ、ETag とデータはプロセスのメモリにしか持たず、`load()` も起動時の 1 回しか呼ばれないので、今は起動のたびに 3 ファイルを全部ダウンロードしている。

`CC_RECOMMENDER_OFFLINE_MODE=true` を設定すると、リモートには取りに行かず同梱データだけを使う。設定ファイルで切り替える方法はない。

## 自分のツールを載せたいとき

- プラグイン: anthropics/claude-plugins-official のマーケットプレイスに載せる。
- MCP サーバー: punkpeye/awesome-mcp-servers に GitHub のリンクで載せるか、公式 MCP Registry に登録する。
- スキル: VoltAgent/awesome-agent-skills か ComposioHQ/awesome-claude-skills に載せる。直接取得するリポジトリは `direct-skill-sources.ts` に固定で書いている。

スキルは `main` ブランチから読むので、デフォルトブランチが `main` でないと取り込まれない。反映されるのは、そのあとの自動更新の PR が main にマージされてから。

## 確認とトラブルシューティング

件数、重複、更新日時は jq で見られる。

```bash
jq '.items | length' data/plugins.json data/mcp-servers.json data/skills.json
jq -r '.items[].url' data/mcp-servers.json | sort | uniq -d
jq -r '.lastUpdated' data/*.json
```

自動 PR を見るときは、前回から件数が大きく減っていないかを確認する。減っていたら、どれかのソースの取得に失敗している。fetch-data はその場合も空の結果を書き出すので、マージせずにワークフローのログを見る。

ワークフローの状態は次のコマンドで確認する。

```bash
gh workflow view update-data.yml        # 有効かどうかと最近の実行
gh run list --workflow=update-data.yml  # 実行履歴
gh pr list --label automated            # 自動 PR
```

実行が 90 分前後で失敗している場合は、fetch-data のステップのタイムアウトに当たっている。スキャンは開始から 70 分で新しいバッチを始めなくなるので、それでも超えるならデータ取得そのものに時間がかかっている。ログ末尾の `Finished in N min` と、各種類の取得・スキャンのログで切り分けられる。ローカルでは `fetch-data:plugins` / `fetch-data:mcp` / `fetch-data:skills` に分けて実行するとよい。

ソース側の形式が変わった（README の書き方が変わった、など）ときは、該当するフェッチャーのパース処理を直す。

## 関連ドキュメント

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
