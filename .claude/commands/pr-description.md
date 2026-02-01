---
name: pr-description
description: "baseブランチからの変更差分を元にPR descriptionを自動生成"
tags: ["git", "pr", "automation", "github"]
---

# PR Description 自動生成スキル

このスキルは、現在のブランチと base ブランチの差分を分析し、`.github/PULL_REQUEST_TEMPLATE.md` の形式に沿った PR description を自動生成します。

**base ブランチの判定順序:**
1. GitHub CLI (gh) でデフォルトブランチを取得
2. upstream ブランチが設定されている場合はそれを使用
3. 手動で指定された場合はそのブランチを使用
4. フォールバック: `main` または `master` を使用

## 使用方法

```bash
/pr-description
```

## 実行内容

### 1. base ブランチの判定

まず、PR の base ブランチを以下の順序で判定します：

```bash
# 1. GitHub CLI でリポジトリのデフォルトブランチを取得
gh repo view --json defaultBranchRef --jq .defaultBranchRef.name

# 2. upstream ブランチを確認
git rev-parse --abbrev-ref @{upstream}

# 3. main または master の存在を確認
git show-ref --verify --quiet refs/heads/main || git show-ref --verify --quiet refs/heads/master
```

### 2. 変更内容の分析

判定した base ブランチを使用して変更内容を取得します：

```bash
# base ブランチを変数に設定（例: main, develop など）
BASE_BRANCH=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name 2>/dev/null || echo "main")

# コミット履歴の取得
git log ${BASE_BRANCH}..HEAD --oneline

# 変更されたファイルの統計
git diff ${BASE_BRANCH}...HEAD --stat

# 実際の変更差分
git diff ${BASE_BRANCH}...HEAD --unified=3
```

### 3. 変更タイプの自動判定

変更されたファイルのパターンから、自動的に Type of Change を判定します：

**判定ルール:**

- **🐛 Bug fix**
  - `fix:` で始まるコミットがある
  - `*.test.ts` ファイルの修正でバグ関連のテストがある

- **✨ New feature**
  - `feat:` で始まるコミットがある
  - 新しいファイルが追加されている（特に `src/` 配下）

- **💥 Breaking change**
  - コミットメッセージに `BREAKING CHANGE` が含まれる
  - `!` 付きのコミット（例: `feat!:`, `fix!:`）がある

- **📝 Documentation update**
  - `docs:` で始まるコミットがある
  - `*.md` ファイルのみの変更

- **🎨 Code style update**
  - `style:` で始まるコミットがある
  - フォーマット関連のファイルのみの変更

- **♻️ Refactoring**
  - `refactor:` で始まるコミットがある
  - 既存のファイルのみの変更で新規ファイルがない

- **⚡ Performance improvement**
  - `perf:` で始まるコミットがある
  - パフォーマンス関連のコードやコメントがある

- **✅ Test update**
  - `test:` で始まるコミットがある
  - `*.test.ts` ファイルのみの変更

### 4. Description の自動生成

#### コミットメッセージから要約を生成

```bash
# コミットメッセージの一覧
git log ${BASE_BRANCH}..HEAD --pretty=format:"- %s"
```

これを元に、以下の形式で要約を生成：

```markdown
## Description

This PR introduces the following changes:

- [コミットメッセージ1]
- [コミットメッセージ2]
- [コミットメッセージ3]
```

#### 変更されたファイルのリスト

```markdown
### Changed Files

- `src/path/to/file1.ts` - 新機能の追加
- `src/path/to/file2.ts` - バグ修正
- `docs/ARCHITECTURE.md` - ドキュメント更新
- `tests/path/to/test.ts` - テスト追加
```

### 5. 自動チェック項目の事前確認

PR を作成する前に、以下を実行して確認：

```bash
# 型チェック
pnpm run typecheck

# Lint
pnpm run lint

# セキュリティ監査
pnpm run audit

# テスト
pnpm run test

# ビルド
pnpm run build

# 全チェック
pnpm run check
```

実行結果を基に、Checklist セクションを自動的にチェック：

```markdown
## How Has This Been Tested?

- [x] I ran `pnpm run check` successfully
- [x] I ran `pnpm run build` successfully
- [x] I tested the changes locally with Claude Code
```

### 6. 生成される PR Description のテンプレート

```markdown
## Description

[コミットメッセージから生成された要約]

### Changed Files

[変更されたファイルのリスト]

## Motivation and Context

[最初のコミットメッセージの本文、または手動入力を促す]

Fixes #(issue)

## Type of Change

[自動判定された変更タイプにチェック]

- [x] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)
- [ ] 📝 Documentation update
- [ ] 🎨 Code style update (formatting, renaming)
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test update

## How Has This Been Tested?

- [x] I ran `pnpm run check` successfully
- [x] I ran `pnpm run build` successfully
- [x] I tested the changes locally with Claude Code

## Checklist

- [x] My code follows the code style of this project (Biome)
- [x] I have updated the documentation accordingly
- [x] I have added tests to cover my changes (if applicable)
- [x] All new and existing tests passed
- [x] I have updated the CHANGELOG.md
- [ ] My changes generate no new warnings
- [x] I have checked my code and corrected any misspellings

## Screenshots (if appropriate)

<!-- Add screenshots to help explain your changes -->

## Additional Notes

<!-- Any additional information that reviewers should know -->
```

## 実装手順

このスキルを呼び出すと、以下の手順で PR が自動作成されます：

### ステップ1: base ブランチの判定

```bash
BASE_BRANCH=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name 2>/dev/null || echo "main")
echo "Base branch: ${BASE_BRANCH}"
```

### ステップ2: 変更内容の取得

```bash
# コミット履歴とファイル差分を取得
git log ${BASE_BRANCH}..HEAD --oneline
git diff ${BASE_BRANCH}...HEAD --name-status
```

### ステップ3: 変更タイプの自動判定

コミットメッセージのプレフィックスとファイルパターンから自動判定します。

### ステップ4: PR タイトルの生成

```bash
# 最新のコミットメッセージから PR タイトルを生成
PR_TITLE=$(git log -1 --pretty=format:"%s")
```

### ステップ5: PR Description の生成

テンプレートに従って description を生成します。

### ステップ6: テスト実行（オプション）

```bash
# PR 作成前にテストを実行（オプション）
pnpm run check
pnpm run build
```

### ステップ7: 既存PR の確認と自動作成

```bash
# 現在のブランチに既存のPRがあるか確認
if gh pr view --json url,title,state 2>/dev/null; then
  echo "✓ PR already exists. Skipping creation."
  echo "Existing PR:"
  gh pr view --json url,title,state --jq '"\(.title)\n\(.url)\nState: \(.state)"'
else
  echo "✓ No existing PR found. Creating new PR..."
  
  # PR description を一時ファイルに保存
  PR_BODY_FILE=$(mktemp)
  cat > "${PR_BODY_FILE}" << 'EOF'
[生成された PR description]
EOF

  # gh コマンドで PR を作成
  gh pr create \
    --title "${PR_TITLE}" \
    --body-file "${PR_BODY_FILE}" \
    --base "${BASE_BRANCH}"

  # 一時ファイルを削除
  rm "${PR_BODY_FILE}"
  
  echo "✓ PR created successfully!"
fi
```

**自動実行される内容:**
1. 現在のブランチに既存のPRがあるか確認
2. **PRが存在しない場合:**
   - 変更内容を分析
   - PR タイトルと description を生成
   - `gh pr create` コマンドで PR を自動作成
   - PR の URL を出力
3. **PRが既に存在する場合:**
   - 既存のPR情報を表示
   - 作成をスキップ

## 使用例

### 基本的な使用方法（自動PR作成）

```bash
# 現在のブランチから PR を自動作成
/pr-description
```

**実行結果（PRが存在しない場合）:**
```
✓ Base branch detected: main
✓ Analyzing changes...
✓ Generating PR description...
✓ No existing PR found. Creating new PR...
✓ Creating pull request...

Created pull request: https://github.com/owner/repo/pull/123
```

**実行結果（PRが既に存在する場合）:**
```
✓ Base branch detected: main
✓ PR already exists. Skipping creation.

Existing PR:
feat(scoring): implement enhanced context-aware scoring system
https://github.com/owner/repo/pull/123
State: OPEN
```

### カスタマイズオプション

#### 1. base ブランチを明示的に指定

```bash
# develop ブランチに対してPRを作成
BASE_BRANCH=develop /pr-description
```

#### 2. ドラフトPRとして作成

```bash
# ドラフトPRとして作成（レビュー前の確認用）
gh pr create --draft --title "..." --body-file "..."
```

#### 3. レビュアーを自動指定

```bash
# レビュアーを指定してPRを作成
gh pr create --title "..." --body-file "..." --reviewer @user1,@user2
```

#### 4. description のみ生成（PR作成はスキップ）

description だけを確認したい場合は、生成された内容を一時ファイルに保存して確認できます：

```bash
# .github/pr-description-draft.md に保存
# 後で手動で調整可能
```

## ベストプラクティス

### 1. コミットメッセージを適切に書く

PR description の品質は、コミットメッセージの品質に依存します。

```bash
# ✅ 良いコミットメッセージ
git commit -m "feat(scoring): implement context-aware scoring (Phase 2)

This commit adds context-aware scoring functionality that analyzes
project metadata and file relationships to improve recommendation accuracy.

- Added MetadataAnalyzer for project context extraction
- Implemented ContextScorer for calculating context similarity
- Updated RecommendationService to use context scores"

# ❌ 悪いコミットメッセージ
git commit -m "update code"
```

### 2. 論理的な単位でコミットする

```bash
# ✅ 良い例（機能ごとにコミット）
git commit -m "feat(scoring): add foundation for enhanced scoring (Phase 1)"
git commit -m "feat(scoring): implement context-aware scoring (Phase 2)"
git commit -m "docs: update documentation for enhanced scoring system"

# ❌ 悪い例（すべてを1つにまとめる）
git commit -m "add new feature"
```

### 3. PR 作成前にチェック

```bash
# 必ず実行してからPRを作成
pnpm run check
pnpm run build

# 追加で推奨
pnpm run test:coverage
```

### 4. CHANGELOG.md の更新を忘れない

```markdown
# CHANGELOG.md に追記
## [Unreleased]

### Added
- Context-aware scoring for improved recommendation accuracy
- Metadata analyzer for project context extraction

### Changed
- Enhanced scoring algorithm to consider project context
```

## トラブルシューティング

### gh コマンドが見つからない

**原因:**
- GitHub CLI がインストールされていない

**解決策:**
```bash
# macOS (Homebrew)
brew install gh

# 認証
gh auth login
```

### PR がすでに存在する

**動作:**
- スキルは自動的に既存のPRを検出してスキップします
- 既存のPR情報が表示されます

**既存のPR description を更新したい場合:**
```bash
# 既存のPRを確認
gh pr view

# description を再生成して更新
# 1. 新しい description を生成（スキルを実行）
/pr-description  # → 既存PRを検出してスキップ

# 2. 手動で description を更新
gh pr edit --body "新しい description"

# または、ファイルから更新
gh pr edit --body-file .github/pr-description-draft.md
```

### 変更タイプが正しく判定されない

**原因:**
- コミットメッセージが Conventional Commits 形式に従っていない

**解決策:**
```bash
# コミットメッセージを修正
git rebase -i main

# または新しいコミットで修正
git commit --amend -m "feat: add new feature"
```

### base ブランチが古い

**原因:**
- ローカルの base ブランチが最新でない

**解決策:**
```bash
# base ブランチを更新（例: main の場合）
BASE_BRANCH=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name 2>/dev/null || echo "main")
git fetch origin
git checkout ${BASE_BRANCH}
git pull origin ${BASE_BRANCH}

# 元のブランチに戻る
git checkout -
```

### 差分が大きすぎる

**原因:**
- 変更が多すぎて PR が巨大になる

**解決策:**
```bash
# 複数のPRに分割することを検討
# 論理的な単位でブランチを分ける

# Phase 1
git checkout -b feat/scoring-phase1
# Phase 1 の変更のみコミット

# Phase 2
git checkout -b feat/scoring-phase2
# Phase 2 の変更のみコミット
```

## 参照

- [GitHub CLI (gh)](https://cli.github.com/) - GitHub CLI 公式サイト
- [gh pr create](https://cli.github.com/manual/gh_pr_create) - PR作成コマンドのドキュメント
- [Conventional Commits](https://www.conventionalcommits.org/) - コミットメッセージ規約
- [GitHub PR best practices](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/best-practices-for-pull-requests)
- [Keep a Changelog](https://keepachangelog.com/) - CHANGELOG.md の形式
