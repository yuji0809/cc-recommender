---
name: dependabot-review
description: "Dependabot PRの依存関係更新を分析・評価するスキル"
tags: ["dependabot", "dependencies", "security", "review", "automation"]
---

# Dependabot PR レビュースキル

## 概要

Dependabot が作成した依存関係更新PRを体系的に分析し、マージ判断を支援するスキル。

## 分析フレームワーク

### 1. 依存関係の分類

PRの依存関係を以下のカテゴリに分類する:

| カテゴリ | 説明 | リスク傾向 |
|---------|------|-----------|
| **runtime dependency** | `dependencies` に含まれる | 高（本番影響あり） |
| **dev dependency** | `devDependencies` に含まれる | 低〜中（開発のみ） |
| **GitHub Actions** | `.github/workflows/` のアクション | 低（CI/CDのみ） |
| **type definitions** | `@types/*` パッケージ | 低（型のみ） |

### 2. バージョン更新タイプの評価

| 更新タイプ | SemVer | リスク |
|-----------|--------|--------|
| **Patch** | x.y.Z | 低 - バグ修正のみ |
| **Minor** | x.Y.0 | 低〜中 - 後方互換の機能追加 |
| **Major** | X.0.0 | 中〜高 - 破壊的変更の可能性 |

### 3. リスク評価マトリクス

```
           | Patch | Minor | Major |
-----------|-------|-------|-------|
Runtime    |  低   |  中   |  高   |
Dev        |  低   |  低   | 低〜中|
Actions    |  低   |  低   |  低   |
Types      |  低   |  低   | 低〜中|
```

## 分析手順

### Step 1: PR情報の収集

```bash
# PR一覧取得
gh pr list --state open --json number,title,author,labels --jq '.[] | select(.author.login == "app/dependabot")'

# 各PRの詳細取得
gh pr view <PR番号> --json title,body,commits,files,statusCheckRollup,mergeable,additions,deletions
```

### Step 2: 変更内容の分析

確認すべき項目:

1. **更新パッケージ名とバージョン範囲**
   - 現在のバージョン → 新しいバージョン
   - SemVer更新タイプ (patch/minor/major)

2. **変更されたファイル**
   - `package.json` の変更箇所
   - `pnpm-lock.yaml` / `package-lock.json` の変更
   - `.github/workflows/*.yml` の変更（GitHub Actions の場合）

3. **リリースノート/チェンジログの確認**
   - 破壊的変更 (Breaking Changes) の有無
   - セキュリティ修正の有無
   - 非推奨化された機能の有無

### Step 3: CI ステータスの確認

```bash
gh pr view <PR番号> --json statusCheckRollup --jq '.statusCheckRollup[] | {name: .name, conclusion: .conclusion, status: .status}'
```

確認項目:
- 全CIチェックがパスしているか
- CodeQL分析の結果
- ビルドが全対象Node.jsバージョンで成功しているか
- テストカバレッジに変化はないか

### Step 4: 互換性の評価

**ランタイム依存関係の場合:**
- APIの破壊的変更がないか
- 最小サポートNode.jsバージョンとの互換性
- peer dependencyの要件変更がないか

**型定義の場合 (@types/*):**
- プロジェクトの`engines`フィールドとの整合性
- 新しいAPIが現在のNode.jsバージョンで利用可能か

**GitHub Actionsの場合:**
- Runner要件の変更
- 入力/出力パラメータの変更
- 必要な権限の変更

### Step 5: セキュリティチェック

- 更新にセキュリティ修正が含まれるか
- Dependabot Security Advisoryに関連するか
- 新しいバージョンに既知の脆弱性がないか

## レポートフォーマット

PRレビューコメントは以下の形式で記述する:

```markdown
## Dependabot PR Analysis

### Summary
| Item | Detail |
|------|--------|
| **Package** | `パッケージ名` |
| **Type** | dependency種別 |
| **Update** | 旧バージョン → 新バージョン (更新タイプ) |
| **Changed Files** | 変更ファイルの説明 |
| **CI Status** | All checks passed / Some checks failed |

### Change Details
- リリースノートの要約
- 主要な変更点

### Risk Assessment: **Low/Medium/High**
- リスク評価の根拠

### Considerations
- 注意すべき点（ある場合）

### Verdict: **Approve/Request Changes/Comment** [絵文字]
判定理由
```

## 判定基準

### 自動承認可能な条件
- devDependency のパッチ更新
- 全CIチェックがパス
- 破壊的変更なし
- セキュリティ修正を含む更新

### 慎重な検討が必要な条件
- ランタイム依存関係のメジャー更新
- CIチェックの失敗
- 破壊的変更を含む更新
- peer dependency の変更
- 最小Node.jsバージョン要件の変更

### 拒否を検討すべき条件
- CIが失敗しており修正が困難
- 破壊的変更が多く移行コストが高い
- セキュリティ上の懸念がある
- プロジェクトの方針と合わない

## 複数PR の優先順位

1. **セキュリティ修正** を含むPR → 最優先
2. **パッチ更新** → 優先（リスク低）
3. **マイナー更新** → 通常
4. **メジャー更新** → 慎重に検討

## 参照

- [Security Agent](../agents/security-agent.md) - セキュリティ関連の詳細チェック
- [Dependabot ドキュメント](https://docs.github.com/en/code-security/dependabot)
