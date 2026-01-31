---
name: documentation-check
description: "ドキュメントとコードの整合性チェック、MDファイルの最新性検証"
tags: ["documentation", "markdown", "consistency", "best-practices"]
---

# ドキュメントチェック スキル

## ドキュメントの役割

ドキュメントはコードと同様に重要です。以下の理由から、常に最新の状態を保つ必要があります：

1. **新規コントリビューターのオンボーディング**
2. **機能の正しい理解と使用**
3. **プロジェクトの保守性向上**
4. **コミュニティとの信頼関係構築**

## ドキュメントの種類と目的

### 1. README.md / README.ja.md

**目的:** プロジェクトの第一印象を決定する最重要ドキュメント

**含むべき内容:**
- プロジェクトの概要と目的
- 主要な機能（Features）
- インストール手順
- 使用方法とサンプルコード
- ライセンス情報
- コントリビューション方法へのリンク

**更新タイミング:**
- 新機能追加時
- API変更時
- 対応環境変更時
- バージョン更新時

### 2. CLAUDE.md

**目的:** 開発者向けの詳細なガイドライン

**含むべき内容:**
- プロジェクト概要
- アーキテクチャ原則
- ディレクトリ構造
- ファイル命名規則
- コーディング規約
- 新機能追加ガイドライン
- 禁止事項

**更新タイミング:**
- アーキテクチャ変更時
- 新しい規約追加時
- ディレクトリ構造変更時

### 3. CONTRIBUTING.md

**目的:** コントリビューター向けのガイド

**含むべき内容:**
- 開発環境のセットアップ
- コーディング規約
- テスト方法
- PR の作成方法
- コミットメッセージの規約

**更新タイミング:**
- 開発環境の要件変更時
- テスト方法変更時
- CI/CD プロセス変更時

### 4. CHANGELOG.md

**目的:** バージョンごとの変更履歴

**含むべき内容:**
- 各バージョンの変更内容
- Added, Changed, Deprecated, Removed, Fixed, Security の分類
- 日付とバージョン番号
- 破壊的変更の明示

**更新タイミング:**
- 新機能追加時（リリース前）
- バグ修正時（リリース前）
- 破壊的変更時（必須）

### 5. docs/ARCHITECTURE.md

**目的:** アーキテクチャの詳細説明

**含むべき内容:**
- システムアーキテクチャ図
- レイヤー構造の説明
- データフローの説明
- 技術選定の理由
- 設計上の制約と決定事項

**更新タイミング:**
- アーキテクチャ変更時
- 新しいレイヤー追加時
- 技術スタック変更時

### 6. SECURITY.md

**目的:** セキュリティポリシーと脆弱性報告手順

**含むべき内容:**
- サポートされているバージョン
- 脆弱性報告手順
- セキュリティ更新ポリシー

**更新タイミング:**
- サポートバージョン変更時
- セキュリティポリシー変更時

## チェックリスト

### コミット前の確認

**コード変更による影響:**
- [ ] 新しいファイル・ディレクトリが追加された → CLAUDE.md のディレクトリ構造を更新
- [ ] 新しい機能が追加された → README.md の Features セクションを更新
- [ ] 新しいパーサーが追加された → README.md の対応言語リストを更新
- [ ] 新しいツールが追加された → README.md の使用方法を更新
- [ ] APIが変更された → README.md のサンプルコードを更新
- [ ] アーキテクチャが変更された → docs/ARCHITECTURE.md を更新
- [ ] 破壊的変更があった → CHANGELOG.md に BREAKING CHANGE として記載

**ドキュメント間の整合性:**
- [ ] README.md と README.ja.md の内容が同期されている
- [ ] package.json のバージョンと CHANGELOG.md が一致している
- [ ] README.md のバッジ（バージョン、Node.js バージョン）が正しい

**ドキュメントの品質:**
- [ ] リンク切れがない
- [ ] コードサンプルが動作する
- [ ] 用語の表記が統一されている
- [ ] フォーマットが統一されている

## ドキュメント更新のベストプラクティス

### 1. コードとドキュメントを同時に更新

```bash
# ❌ 悪い例
git add src/services/new-feature.ts
git commit -m "feat: add new feature"

# 後でドキュメントを更新しようとして忘れる

# ✅ 良い例
# 機能実装
git add src/services/new-feature.ts

# ドキュメント更新
git add README.md
git add CHANGELOG.md

# 一緒にコミット
git commit -m "feat: add new feature

- Implemented new feature in src/services/new-feature.ts
- Updated README.md with usage examples
- Added entry to CHANGELOG.md"
```

### 2. サンプルコードは実際に動作するものを記載

```markdown
# ❌ 悪い例（動作しないコード）
\```typescript
const result = await recommend(database, projectInfo);
// result を使って何かする...
\```

# ✅ 良い例（完全に動作するコード）
\```typescript
import { recommend } from "./services/recommender/recommendation.service.js";

const result = await recommend(database, projectInfo, "TypeScript skills");
console.log(`Found ${result.length} recommendations`);

for (const rec of result) {
  console.log(`- ${rec.item.name}: ${rec.score}`);
}
\```
```

### 3. 英語版と日本語版を同期

```bash
# README.md を更新したら、必ず README.ja.md も更新
# 自動翻訳ツールを使うのではなく、手動で適切に翻訳
```

### 4. CHANGELOG.md は Keep a Changelog フォーマットに従う

```markdown
# ✅ 良い例
## [0.6.0] - 2026-02-01

### Added
- Rust (Cargo.toml) パーサーのサポート
- PHP (composer.json) パーサーのサポート
- ドキュメントチェック用エージェント

### Changed
- スコア説明の閾値を1-100スケールに修正

### Fixed
- コンソールログの使い方を修正（console.error → console.log/warn）
```

## ドキュメント品質チェックツール

### リンク切れチェック

```bash
# Markdown ファイル内のリンクをチェック
npx markdown-link-check README.md
npx markdown-link-check README.ja.md
```

### スペルチェック

```bash
# スペルチェック（英語）
npx cspell "**/*.md"
```

### フォーマットチェック

```bash
# Markdown フォーマット
npx prettier --check "**/*.md"

# 自動修正
npx prettier --write "**/*.md"
```

## トラブルシューティング

### ドキュメントが古くなっている兆候

1. **Issue で質問が多い**
   - ドキュメントに記載されていない内容が多い
   - サンプルコードが動作しない

2. **PR で頻繁にドキュメント更新が指摘される**
   - コード変更時にドキュメント更新を忘れている

3. **新規コントリビューターが混乱している**
   - セットアップ手順が古い
   - ディレクトリ構造が実際と異なる

### 解決策

1. **定期的なドキュメント監査**
   - 月に1回、すべてのドキュメントをレビュー
   - サンプルコードが動作するか確認

2. **コミット前チェックに組み込む**
   - `/pre-commit-check` でドキュメントもチェック

3. **CI/CDでドキュメントをテスト**
   - リンク切れチェックを自動化
   - サンプルコードの動作確認を自動化

## 参照

- [Keep a Changelog](https://keepachangelog.com/) - CHANGELOG.md のフォーマット
- [Semantic Versioning](https://semver.org/) - バージョニング規約
- [CommonMark](https://commonmark.org/) - Markdown 仕様
