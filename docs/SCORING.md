# スコアリング

`recommend_skills` と `search_skills` は別々の方法で採点します。この文書の大半は `recommend_skills` の計算で、`search_skills` は最後の節で扱います。

`recommend_skills` のスコアは 4 つの要素からなります。

- 基本スコア: 言語・フレームワーク・依存関係・ファイル・キーワードの一致（`scoring/scorer.ts`）
- コンテキストスコア: モノレポかどうか、プロジェクトの規模、推定チーム規模（`scoring/context-scorer.ts`）
- 類似性スコア: タグの共起関係（`scoring/similarity-scorer.ts`）
- 品質スコア: 公式かどうか、スター数、更新日、ソース（`quality-scorer.ts`）

コンテキストスコアと類似性スコアは v0.9.0 で追加されました。ファイルはいずれも `src/services/recommender/` の下にあります。

## 計算式

```
基本スコア   = Σ(一致した件数 × 重み) × 公式倍率 × セキュリティ倍率
生スコア     = 基本スコア + コンテキストスコア + 類似性スコア
マッチスコア = 生スコア <= 0 なら 1
               それ以外は round(min(100, max(1, 生スコア / 50 × 100)))
最終スコア   = マッチスコア + 品質スコア × 0.2
```

正規化の基準になる 50 は `SCORING_THRESHOLDS.maxRawScore` です。生スコアが 50 以上ならマッチスコアは 100 になります。品質スコアは 0〜100 なので、最終スコアは 1〜120 の範囲になります。品質スコアに 0.2 を掛けたあとは丸めないので、最終スコアは小数になることがあります（例: 14.4）。表示ラベルはこの最終スコアに対して付けます。

`recommend()` の `minScore` は既定で 1 ですが、マッチスコアは必ず 1 以上なので、この条件で落ちるアイテムはありません。指定されたタイプの全アイテムを採点し、最終スコアの降順で上位 `max_results` 件（既定 20）を返します。

## 基本スコア

`detection` の各項目について、一致した件数 × 重みを足します。重みは `scoring-config.ts` の `SCORING_WEIGHTS` です。

| 項目 | 重み | 照合方法 |
|---|---|---|
| 言語 | 5 | `detection.languages` の各要素を小文字にして、`project.languages` に含まれるか |
| フレームワーク | 4 | `detection.frameworks` の各要素を小文字にして、`project.frameworks` に含まれるか |
| 依存関係 | 3 | `detection.dependencies` と `project.dependencies` を両方小文字にして完全一致 |
| ファイル | 2 | `detection.files` の各 glob パターンが `project.files` のどれかに一致するか（`matchGlob()`、大文字小文字は無視） |
| キーワード | 1 | 下記 |

プロジェクトの走査では名前が `.` で始まるファイルとディレクトリを飛ばすので、`.eslintrc*` や `.github/**` のようなパターンは一致しません。

キーワードは、`recommend_skills` に `description` が渡されたときだけ見ます。`detection.keywords` と `tags` の各要素について、description（小文字化）がその語を部分文字列として含めば 1 件と数えます。`keywords` と `tags` の両方に同じ語があれば 2 件になります（マッチ内容の表示では 1 回にまとめられます）。さらに description がアイテム名を含んでいれば +2 です。

合計に次の倍率を掛けます（`SCORING_MULTIPLIERS`）。

| 条件 | 倍率 |
|---|---|
| `metrics.isOfficial` が true | ×1.3 |
| `metrics.securityScore` が 80 以上 | ×1.1 |
| `metrics.securityScore` が 50 未満 | ×0.7 |

公式倍率とセキュリティ倍率は重ねて掛かります。セキュリティスコアが 50〜79 のときと未設定のときは倍率なしです。倍率は基本スコアにだけ掛かり、コンテキストスコアと類似性スコアには掛かりません。

データ生成（`scripts/fetch-data.ts`）でセキュリティスコア 70 未満のアイテムは除かれるため、通常の手順で作ったデータに ×0.7 が掛かるアイテムはありません。

## コンテキストスコア

`project.metadata` があり、`ENHANCED_SCORING_FLAGS.enableContextScoring` が true（既定）のときに加点します。重みは `enhanced-scoring-config.ts` の `CONTEXT_SCORE_WEIGHTS`、タグの一覧は `context-scorer.ts` に直接書かれています。

| 加点 | 点数 | 条件 |
|---|---|---|
| モノレポ | +3.0 | プロジェクトがモノレポで、アイテムのタグ（小文字化）が `monorepo`、`workspace`、`nx`、`turborepo`、`lerna`、`pnpm` のどれかと完全一致する |
| サイズ | +2.0 | large か enterprise で、タグのどれかが `ci/cd`、`monitoring`、`testing`、`documentation` を含む。または small で、タグが `quick-start`、`beginner`、`simple`、`lightweight` を含む |
| チーム規模 | +1.5 | 推定チーム規模が 5 より大きく、タグが `collaboration`、`team`、`review`、`workflow` を含む |

サイズとチーム規模のタグ判定は部分一致（`testing-library` も `testing` に当たる）です。medium のプロジェクトにはサイズの加点はありません。コンテキストスコアの最大は 6.5 です。

メタデータは `services/analyzer/metadata-analyzer.service.ts` が `ProjectInfo` から求めます。

種類（kind）は、`files` に `pnpm-workspace.yaml`、`lerna.json`、`nx.json`（いずれもルート直下）があるか、`packages/` か `apps/` で始まるパスがあればモノレポになります。それ以外は library、application、unknown に分類されますが、スコアに使うのはモノレポかどうかだけです。

サイズは、ファイル数と依存関係数の両方が閾値以下になる最初の区分です（`PROJECT_SIZE_THRESHOLDS`）。

| サイズ | ファイル数 | 依存関係数 |
|---|---|---|
| small | 100 以下 | 10 以下 |
| medium | 500 以下 | 30 以下 |
| large | 2000 以下 | 100 以下 |
| enterprise | 上記以外 | |

ファイル数はスキャン時に 1000 件で打ち切られるので、enterprise になるのは実際には依存関係が 100 を超えたときだけです。

推定チーム規模は `ファイル数 / 50 + 依存関係数 / 10 + 言語数 × 2` を計算し、5 未満なら 1、15 未満なら 3、40 未満なら 10、それ以上なら 25 とします。チーム規模の加点が付くのは 10 か 25 のとき、つまり計算値が 15 以上のときです。

## 類似性スコア

`ENHANCED_SCORING_FLAGS.enableSimilarityScoring` が true（既定）のとき、`recommend()` が呼ばれるたびに DB の全アイテムからタグの共起行列を作ります。各アイテムのタグを小文字にして重複を除き、タグごとの出現数とタグの組ごとの共起数を数えます。`types` で絞り込んだ場合も、行列は全アイテムから作ります。

プロジェクト側のタグは、`languages` と `frameworks` の全件に `dependencies` の先頭 10 件を加え、小文字にしたものです。先頭 10 件はパーサーが集めた順（package.json なら dependencies、devDependencies、peerDependencies の順）で、重要度で選んでいるわけではありません。重複は除かないので、同じ語が言語と依存関係の両方にあれば 2 回数えます。

プロジェクトのタグとアイテムのタグのすべての組について類似度を出し、0.3 以上のものを合計します。上限は 5.0 です（`SIMILARITY_THRESHOLDS`）。

- 同じ文字列なら 1.0
- 共起数が 3 未満なら 0
- それ以外は Jaccard 係数 `共起数 / (A の出現数 + B の出現数 − 共起数)`

## 品質スコア

`quality-scorer.ts` の `calculateQualityScore()` が 0〜100 点で出し、その 0.2 倍を最終スコアに足します。0.2 は `recommendation.service.ts` に直接書かれています。

| 要素 | 点数 |
|---|---|
| 公式 | `metrics.isOfficial` が true なら 40、それ以外は 0 |
| スター数 | `min(log10(stars + 1) × 10, 30)`。0 か未設定なら 0 |
| 鮮度 | `metrics.lastUpdated` から 30 日未満 20、90 日未満 15、180 日未満 10、365 日未満 5、それ以上 0。未設定なら 10 |
| ソース | `metrics.source` が `official` なら 10、`awesome-list` なら 7、`community` かそれ以外なら 5 |

いまのフェッチャーはスター数を取得していません（スキルは 0 を入れ、プラグインと MCP サーバーは設定しない）。そのため、現行データではスター数の項は全アイテムで 0 です。`lastUpdated` を設定しているのは公式 MCP Registry 由来のアイテムだけで、それ以外は鮮度 10 点になります。また `skill-parser.ts` はキュレーションリスト経由のものも含め、すべてのスキルを `isOfficial: true`、`source: "official"` として作ります。

`formatted` テキストでは、品質スコアが 80 以上なら星 3 つ、60 以上なら 2 つ、40 以上なら 1 つの印がアイテム名の横に付きます（`getQualityBadge()`）。

## 表示

`getScoreIndicator()`（`scorer.ts`）と `getScoreExplanation()`（`formatters.ts`）が、最終スコアからラベルと説明文を決めます。

| 最終スコア | ラベル | 説明文 |
|---|---|---|
| 80 以上 | 高適合 | プロジェクトに強く推薦 |
| 50 以上 | 適合 | プロジェクトに適合 |
| 20 以上 | 参考 | 参考として有用 |
| 20 未満 | なし | 低い適合度 |

20 未満のアイテムも除外されず、ラベルなしで表示されます。`formatted` テキストでは各タイプ 5 件までです。

採点の理由は `reasons` に入り、`formatted` テキストでは「マッチ内容」として表示されます。基本スコアの理由は `言語: typescript`、`フレームワーク: supabase`、`依存関係: @supabase/supabase-js`、`ファイル: pnpm-workspace.yaml`、`キーワード: monorepo`、`名前一致: <名前>` の形で、公式アイテムで他に理由があれば `公式` が付きます。続いてコンテキストの `モノレポ対応`、`<size>プロジェクト向け`（例: `largeプロジェクト向け`）、`チーム規模適合`、類似性の `類似タグ: typescript ≈ typescript` が並びます。

内訳（基本・コンテキスト・類似性・品質 × 0.2・最終）は `ScoredRecommendation.breakdown` に入りますが、`recommend_skills` のレスポンスには含めていません。

## 計算例

以下はどれも説明用の架空のアイテムです。数値は実際の `calculateScore()` と `calculateQualityScore()` に同じ入力を与えて確かめています。タグの共起行列は、それぞれの例のアイテム 1 件だけから作っています。そのため共起数はどの組も 3 未満で、類似性の加点は同じタグどうしの 1.0 だけになります。

### 例 1: TypeScript + Supabase のプロジェクトと公式 MCP サーバー

プロジェクトはファイル 152 件、依存関係 5 件（`react`、`@supabase/supabase-js`、`zod`、`vite`、`typescript` の順）で、言語は javascript と typescript、フレームワークは react と supabase です（サイズ medium、推定チーム規模 3）。

アイテムは `detection` に言語 typescript、フレームワーク supabase、依存関係 `@supabase/supabase-js` を持ち、公式、セキュリティスコア 85、ソース official、更新から 10 日、タグは `databases` と `typescript` です。

```
言語 typescript               5
フレームワーク supabase       4
依存関係 @supabase/supabase-js 3
小計                         12
× 1.3（公式）× 1.1（セキュリティ 85） = 17.16
コンテキスト                  0（medium、チーム規模 3、モノレポでない）
類似性                        2（typescript が言語と依存関係の両方にあるため、typescript ≈ typescript を 2 回数える）
生スコア                      19.16
マッチスコア                  round(19.16 / 50 × 100) = 38
品質スコア                    公式 40 + スター 0 + 鮮度 20 + ソース 10 = 70
最終スコア                    38 + 70 × 0.2 = 52（適合）
マッチ内容                    言語: typescript, フレームワーク: supabase, 依存関係: @supabase/supabase-js, 公式, 類似タグ: typescript ≈ typescript, 類似タグ: typescript ≈ typescript
```

### 例 2: Python のプロジェクトと awesome-list 由来の MCP サーバー

プロジェクトは `requirements.txt` と `main.py` だけで、依存関係は `requests` 1 件です（サイズ small）。アイテムは言語 python だけが一致し、公式ではなく、セキュリティスコア 90、ソース awesome-list、更新日は不明、タグは `developer tools` と `python` です。awesome-mcp-servers 由来のアイテムは言語がタグにも入るので、類似性の 1.0 が付くのが普通です。

```
言語 python                   5
× 1.1（セキュリティ 90）      = 5.5
類似性                        1（python ≈ python）
生スコア                      6.5
マッチスコア                  round(6.5 / 50 × 100) = 13
品質スコア                    公式 0 + スター 0 + 鮮度 10 + ソース 7 = 17
最終スコア                    13 + 17 × 0.2 = 16.4（ラベルなし、「低い適合度」として表示される）
```

### 例 3: モノレポで description を指定した場合

プロジェクトはルートに `pnpm-workspace.yaml` があり、`packages/` 以下を含めてファイル 303 件、依存関係は `turbo`、`eslint`、`prettier` の 3 件、言語は javascript と typescript です（モノレポ、サイズ medium、推定チーム規模 3）。description は「monorepo のビルドを速くしたい」です。

アイテムはコミュニティのプラグインで、セキュリティスコアなし、更新日不明です。`detection` は言語 typescript、ファイル `pnpm-workspace.yaml`、キーワード `monorepo` で、タグは `monorepo`、`typescript`、`pnpm` です。

```
言語 typescript               5
ファイル pnpm-workspace.yaml   2
キーワード monorepo           2（keywords と tags の両方で 1 件ずつ）
基本スコア                    9（公式でもセキュリティスコアもないので倍率なし）
コンテキスト                  3（モノレポ。medium なのでサイズ加点なし）
類似性                        1（typescript ≈ typescript）
生スコア                      13
マッチスコア                  round(13 / 50 × 100) = 26
品質スコア                    公式 0 + スター 0 + 鮮度 10 + ソース 5 = 15
最終スコア                    26 + 15 × 0.2 = 29（参考）
マッチ内容                    言語: typescript, ファイル: pnpm-workspace.yaml, キーワード: monorepo, モノレポ対応, 類似タグ: typescript ≈ typescript
```

## search_skills のスコア

`search_skills` は `search.service.ts` の `search()` を使い、ここまでの計算は使いません。クエリ全体を小文字にし、各フィールドがそれを部分文字列として含むかで加点します。クエリを単語に分けることはしません。

| 一致した場所 | 点数 |
|---|---|
| 名前 | +10 |
| 説明文 | +5 |
| カテゴリ | +3 |
| タグ（最初に一致した 1 つだけ） | +2 |

公式アイテムは合計を 1.2 倍します。0 点のアイテムは除き、降順で上位 `max_results` 件を返します。正規化、品質スコア、ラベルはありません。最大は (10 + 5 + 3 + 2) × 1.2 = 24 点です。

## 調整するとき

実行時に重みを変える手段（環境変数やツールの引数）はありません。変えるときは次の場所を編集します。

| 変えたいもの | 場所 |
|---|---|
| 基本スコアの重み、倍率 | `src/config/scoring-config.ts` の `SCORING_WEIGHTS`、`SCORING_MULTIPLIERS` |
| セキュリティ倍率の閾値、正規化の基準（50） | 同じファイルの `SCORING_THRESHOLDS`（`highSecurityThreshold`、`lowSecurityThreshold`、`maxRawScore`） |
| コンテキストの重み、サイズの閾値、類似性の閾値 | `src/config/enhanced-scoring-config.ts` |
| コンテキストスコア・類似性スコアのオン・オフ | 同じファイルの `ENHANCED_SCORING_FLAGS` |
| コンテキストで見るタグの一覧 | `scoring/context-scorer.ts` |
| 品質スコアの配点、最終スコアへの係数 0.2 | `quality-scorer.ts`、`recommendation.service.ts` |
| ラベルの閾値（80 / 50 / 20） | `scorer.ts` の `getScoreIndicator()` と `formatters.ts` の `getScoreExplanation()`（両方を揃える） |
| `search_skills` の配点 | `search.service.ts` |

`SCORING_THRESHOLDS` の `minScore` と `maxResults` はどこからも参照されていません。`recommend()` は同じ値（1 と 20）を自分の既定値として持っています。

関係するテストは `tests/recommender/scorer.test.ts`、`quality-scorer.test.ts`、`search.test.ts`、`tests/services/recommender/scoring/` の 2 ファイル、`tests/services/analyzer/metadata-analyzer.test.ts` です。
