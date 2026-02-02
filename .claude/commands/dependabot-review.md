---
name: dependabot-review
description: "Dependabot PRを分析してリスク評価・レビューコメントを投稿"
---

# Dependabot PR レビュー

このコマンドは、Dependabot が作成した依存関係更新PRを分析し、レビューコメントを投稿します。

## 引数

- `$ARGUMENTS` にPR番号が指定された場合、そのPRのみを分析
- 引数なしの場合、全てのオープンなDependabot PRを分析

## 実行手順

### 1. 対象PRの取得

**PR番号指定あり（`$ARGUMENTS` が空でない場合）:**
```bash
gh pr view $ARGUMENTS --json title,body,commits,files,statusCheckRollup,mergeable,additions,deletions,headRefName,baseRefName,author
```

**PR番号指定なし:**
```bash
gh pr list --state open --json number,title,author,labels,url --jq '.[] | select(.author.login == "app/dependabot")'
```

Dependabot PRが見つからない場合は、その旨をユーザーに報告して終了してください。

### 2. 各PRの詳細分析

**Dependabot Review Agent** を使用して、各PRに対して以下の分析を実行してください。
複数PRがある場合は**並列で**エージェントを起動します。

各エージェントに渡す指示:

```
Dependabot PR #<番号> を分析してください。

以下の手順で実行:
1. `gh pr view <番号> --json title,body,commits,files,statusCheckRollup,mergeable,additions,deletions` でPR情報を取得
2. `gh pr diff <番号>` で差分を確認
3. PRのbodyからリリースノート・チェンジログを確認
4. 以下を分析:
   - パッケージ名、更新タイプ（patch/minor/major）、依存種別（deps/devDeps/actions）
   - CIステータス（全チェックの成功/失敗）
   - 破壊的変更の有無
   - セキュリティ修正の有無
   - 互換性の懸念
5. リスク評価（Low/Medium/High）を決定
6. レビューコメントを `gh pr review` で投稿
   - Approve: 全CIパス＋リスク低〜中
   - Comment: メジャー更新で要注意
   - Request Changes: CI失敗またはセキュリティ懸念
7. 分析結果のサマリーを返す
```

### 3. サマリーの表示

全PRの分析完了後、以下の形式でユーザーにサマリーを表示:

```markdown
## Dependabot PR レビュー結果

| PR | パッケージ | 種別 | 更新 | CI | リスク | 判定 |
|----|----------|------|------|----|--------|------|
| #XX | pkg-name | devDeps | 1.0→2.0 (Major) | PASS | Low | Approve |

### 推奨マージ順序
1. セキュリティ修正を含むPR（最優先）
2. パッチ更新（リスク低）
3. マイナー更新
4. メジャー更新（慎重に）

### 注意事項
- （各PRの注意点があれば記載）
```

## 注意事項

- 各PRのレビューは独立して実行可能なため、**並列処理**を推奨
- セキュリティ修正を含むPRは優先的に処理すること
- CIが失敗しているPRは原因を調査し、ユーザーに報告すること
- ランタイム依存のメジャー更新は特に慎重に分析すること
