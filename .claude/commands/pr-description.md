---
name: pr-description-ja
description: "baseブランチからの変更差分を元にPR descriptionを日本語で自動生成"
tags: ["git", "pr", "automation", "github", "japanese"]
---

# 実行指示

現在のブランチの変更内容を分析し、**日本語**で包括的なPull Request descriptionを生成してください。

## 実行手順

### 1. ベースブランチの判定

以下のコマンドでベースブランチを検出：

```bash
BASE_BRANCH=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name 2>/dev/null || echo "main")
echo "Base branch: ${BASE_BRANCH}"
```

### 2. 変更内容の分析

コミット履歴とファイル変更を取得：

```bash
# コミットメッセージを取得
git log ${BASE_BRANCH}..HEAD --pretty=format:"%s"

# 変更されたファイルを取得
git diff ${BASE_BRANCH}...HEAD --name-status

# ファイル統計を取得
git diff ${BASE_BRANCH}...HEAD --stat
```

### 3. 変更タイプの自動判定

コミットメッセージとファイルパターンから変更タイプを判定：

- **🐛 Bug fix**: `fix:` で始まるコミット
- **✨ New feature**: `feat:` で始まるコミット、または `src/` 配下の新規ファイル
- **💥 Breaking change**: `BREAKING CHANGE` を含む、または `feat!:`, `fix!:` のコミット
- **📝 Documentation update**: `docs:` で始まるコミット、または `*.md` ファイルのみの変更
- **🎨 Code style update**: `style:` で始まるコミット
- **♻️ Refactoring**: `refactor:` で始まるコミット
- **⚡ Performance improvement**: `perf:` で始まるコミット
- **✅ Test update**: `test:` で始まるコミット、または `*.test.ts` ファイルのみの変更

### 4. 既存PRの確認

```bash
gh pr view --json url,title,state 2>/dev/null
```

PRが既に存在する場合は、更新するか、生成した内容を表示するだけかをユーザーに確認してください。

### 5. PR Descriptionの生成

`.github/PULL_REQUEST_TEMPLATE.md` のテンプレートに従い、**日本語**で包括的なPR descriptionを生成：

**構成:**
- **Description（概要）**: コミットメッセージから変更内容を要約
- **Changed Files（変更ファイル）**: 新規ファイルと変更ファイルを簡潔に説明
- **Motivation and Context（動機と背景）**: なぜこの変更が必要かを説明
- **Type of Change（変更タイプ）**: 分析結果に基づき該当項目にチェック
- **How Has This Been Tested（テスト方法）**: 実行したテストコマンドを記載
- **Checklist（チェックリスト）**: 完了した項目をマーク
- **Additional Notes（補足事項）**: 実装アプローチ、今後の改善案、破壊的変更（ある場合）

**重要:**
- 明確で分かりやすい日本語で記述
- 簡潔かつ包括的に
- ファイル統計（変更ファイル数、追加行数、削除行数）を含める
- カテゴリごとにグループ化（新規ファイル vs 変更ファイル）
- 共同執筆者の行を追加: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`

### 6. PRの更新または作成

PRが存在する場合：
```bash
# 一時ファイルに保存
# gh pr edit --body-file /tmp/pr-description.md で更新
```

PRが存在しない場合：
```bash
# 新規PR作成の確認をユーザーに求める
# はいの場合: gh pr create --title "..." --body-file /tmp/pr-description.md --base ${BASE_BRANCH}
```

### 7. クリーンアップ

一時ファイルを削除し、PR URLをユーザーに表示してください。

## 出力形式

生成したdescriptionを読みやすい形式でユーザーに提示し、PR更新/作成前に確認を取ってください。

**出力例:**

```
✓ ベースブランチを検出: main
✓ 21ファイルにわたる8コミットを分析中...
✓ PR description を生成しました（日本語）

[生成された description のプレビューを表示]

PR: https://github.com/owner/repo/pull/123
ステータス: 更新完了
```

## 注意事項

- 常に**日本語**でdescriptionを生成
- 専門的で分かりやすい文体を使用
- 何が変更され、なぜ変更されたかを具体的に記述
- テストカバレッジ情報を含める
- Conventional Commits形式で変更タイプを検出
