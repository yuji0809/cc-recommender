# 推奨コマンド

## 開発コマンド

### ビルド関連

```bash
# TypeScriptコンパイル（本番ビルド）
pnpm run build

# 開発モード（watch mode）
pnpm run dev

# 型チェックのみ（ビルドなし）
pnpm run typecheck
```

### コード品質

```bash
# Biome lint + format チェック
pnpm run lint

# 自動修正（safe fixes）
pnpm run lint:fix

# フォーマットのみ
pnpm run format

# 型チェック + lint
pnpm run check
```

### データ管理

```bash
# データベース更新（全ソースからデータ取得）
pnpm run fetch-data
# 実行内容: pnpm exec tsx scripts/fetch-data.ts
# 出力: data/recommendations.json
```

### 実行

```bash
# MCPサーバー起動（ビルド後）
pnpm start
# 実行内容: node dist/index.js

# 開発中の実行（ビルドなしでTypeScript直接実行）
pnpm exec tsx src/index.ts
```

## Git操作

```bash
# 変更確認
git status
git diff

# コミット
git add .
git commit -m "message"

# プッシュ
git push origin main
```

## パッケージ管理

```bash
# 依存関係インストール
pnpm install

# 依存関係更新
pnpm update

# パッケージ追加
pnpm add <package-name>
pnpm add -D <package-name>
```

## MCPサーバー関連

### ローカルテスト

Claude Codeの設定（`~/.claude/settings.json`）:

```json
{
  "mcpServers": {
    "cc-recommender": {
      "command": "node",
      "args": ["/Users/fujinamiyuji/Desktop/Private/repo/cc-recommender/dist/index.js"]
    }
  }
}
```

### npm公開時（将来）

```json
{
  "mcpServers": {
    "cc-recommender": {
      "command": "npx",
      "args": ["-y", "cc-recommender"]
    }
  }
}
```

## macOS（Darwin）固有コマンド

```bash
# ファイル検索
find . -name "*.ts"

# テキスト検索
grep -r "pattern" src/

# ディレクトリリスト
ls -la

# ファイル内容表示
cat file.txt

# JSONフォーマット確認
cat data/recommendations.json | python3 -m json.tool
```

## トラブルシューティング

```bash
# node_modules削除して再インストール
rm -rf node_modules package-lock.json
npm install

# distディレクトリクリーン
rm -rf dist
npm run build

# TypeScriptコンパイルエラー確認
npm run typecheck

# データベース再生成
npm run fetch-data
```

## 開発フロー

```bash
# 1. コード変更
# 2. 型チェック
npm run typecheck

# 3. ビルド
npm run build

# 4. MCPサーバーテスト（Claude Codeで実行）
# Claude Codeを再起動してMCPサーバーを再読み込み

# 5. データ更新が必要な場合
npm run fetch-data
```
