# データベース更新戦略（メンテナー向け）

> このドキュメントは **プロジェクトメンテナー向け** です。
> ユーザー向けの情報は [DATA_UPDATES_USER.md](./DATA_UPDATES_USER.md) を参照してください。

## 現在の運用方針

### 自動更新スケジュール

**毎週月曜日 AM 9:00 JST**
- ワークフロー: `.github/workflows/update-data.yml`
- セキュリティスキャン: 有効
- 実行時間: 30分〜1時間

### ワークフローの動作

```
1. GitHub Actions scheduled trigger
   ↓
2. データ取得（5分）
   - Plugins (GitHub API)
   - MCP servers (awesome-mcp-servers)
   - Skills (awesome-claude-code)
   ↓
3. セキュリティスキャン（30-60分）
   - 全リポジトリをcc-auditでスキャン
   - 並列実行（3リポジトリ同時）
   - スコア計算・更新
   - 脆弱性検出
   ↓
4. 変更チェック
   ↓
5. PR自動作成（変更がある場合）
   ↓
6. レビュー & マージ（手動）
   ↓
7. 次回npm公開時に反映
```

## 手動更新

### フル更新（セキュリティスキャン込み）

```bash
pnpm run fetch-data:full
```

### クイック更新（緊急時のみ）

```bash
pnpm run fetch-data:quick
```

セキュリティスキャンをスキップします。緊急時のみ使用してください。

## リリース前のチェックリスト

```bash
# 1. 最新データ取得
pnpm run fetch-data:full

# 2. 変更確認
git diff data/recommendations.json

# 3. コミット
git add data/recommendations.json
git commit -m "chore(data): update recommendations for v0.x.0"

# 4. バージョンアップ
npm version minor  # or patch/major

# 5. 公開
npm publish
```

## GitHub Actions設定

### 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `SKIP_SECURITY_SCAN` | セキュリティスキャンをスキップ | `false` |
| `GITHUB_TOKEN` | GitHub API認証 | 自動設定 |

### 手動実行

GitHub Actions の「Actions」タブから手動実行可能:
1. 「Update Recommendations Database」を選択
2. 「Run workflow」をクリック

## トラブルシューティング

### スキャンがタイムアウトする

**原因**: リポジトリ数が多すぎる

**解決策**:
```bash
# 並列数を増やす（scripts/fetch-data.ts）
scanRepositories(repos, 5)  // 3 → 5
```

### PRが作成されない

**原因**: データに変更がない

**確認**:
```bash
pnpm run fetch-data:quick
git status
```

### APIレート制限

GitHub APIのレート制限:
- **認証なし**: 60 requests/hour
- **認証あり**: 5000 requests/hour

GitHub Actions では自動的に認証されます。

## セキュリティスキャンについて

### 実施内容

- cc-auditによる全リポジトリスキャン
- 100+の検出ルール
- Exfiltration, Escalation, Persistence, Injection の検出

### スキャン結果

- セキュリティスコアを各アイテムに付与
- 脆弱性が見つかった場合、PR に記載

## データソースの追加

新しいデータソースを追加する場合:

1. `scripts/fetch-data.ts` に fetcher を追加
2. `src/types/` に型定義を追加
3. `src/types/index.ts` で公開
4. テスト実行

```bash
pnpm run fetch-data
pnpm run check
pnpm run build
```

## 参考資料

- [GitHub Actions Workflows](./.github/workflows/)
- [cc-audit Documentation](https://github.com/anthropics/cc-audit)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
