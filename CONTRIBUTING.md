# 貢献ガイド

cc-recommenderへの貢献ありがとうございます！

## 重要なドキュメント

開発を始める前に、以下のドキュメントを必ず確認してください:

- **[CLAUDE.md](./CLAUDE.md)** - 開発ガイドライン、コーディング規約、アーキテクチャ原則
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - 詳細なアーキテクチャドキュメント

## 開発環境のセットアップ

### 前提条件

- Node.js >= 22.0.0
- pnpm >= 10.0.0

### セットアップ手順

1. リポジトリをフォーク
2. クローン

```bash
git clone https://github.com/your-username/cc-recommender.git
cd cc-recommender
```

3. 依存関係インストール

```bash
pnpm install
```

4. ブランチ作成

```bash
git checkout -b feature/your-feature-name
```

## コード品質基準

このプロジェクトは以下のツールで品質を管理しています：

### Biome (Linter + Formatter)

- **自動フォーマット**: コード保存時に自動実行（推奨設定）
- **厳格なルール**: OSSプロジェクトレベルの品質基準
- **高速**: Rust製で非常に高速

```bash
# チェック
pnpm run lint

# 自動修正
pnpm run lint:fix

# フォーマット
pnpm run format
```

### TypeScript

- **strict mode**: 厳格な型チェック有効
- **noUnusedLocals**: 未使用変数を許可しない
- **noUnusedParameters**: 未使用パラメータを許可しない

```bash
# 型チェック
pnpm run typecheck
```

### Git Hooks (Husky)

コミット前に自動実行：

1. **lint-staged**: 変更されたファイルのみをチェック
2. **型チェック**: 型エラーがないか確認

**重要**: フックが失敗した場合、コミットは中断されます。エラーを修正してから再度コミットしてください。

## コミットメッセージ規約

Conventional Commitsに従ってください：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードフォーマット（機能変更なし）
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト追加・修正
- `chore`: ビルド・設定変更

### 例

```bash
git commit -m "feat(recommender): add support for custom scoring weights"
git commit -m "fix(analyzer): handle missing package.json gracefully"
git commit -m "docs(readme): update installation instructions"
```

## プルリクエスト

1. **テスト**: すべてのチェックが通ることを確認

```bash
pnpm run check
pnpm run build
```

2. **説明**: 変更内容を明確に記載
   - 何を変更したか
   - なぜ変更したか
   - どのようにテストしたか

3. **レビュー**: フィードバックに対応

## ディレクトリ構造

詳細は [CLAUDE.md](./CLAUDE.md) および [ARCHITECTURE.md](./docs/ARCHITECTURE.md) を参照してください。

```
cc-recommender/
├── src/
│   ├── index.ts              # MCPサーバーエントリーポイント
│   ├── config/               # 設定ファイル
│   ├── repositories/         # データアクセス層
│   ├── utils/                # 共通ユーティリティ
│   ├── types/                # 型定義（ドメイン別）
│   ├── schemas/              # Zodバリデーションスキーマ
│   ├── services/             # ビジネスロジック
│   │   ├── analyzer/         # プロジェクト分析
│   │   ├── recommender/      # 推薦アルゴリズム
│   │   ├── plugin-fetcher.ts # プラグインデータ取得
│   │   ├── mcp-fetcher.ts    # MCPサーバーデータ取得
│   │   └── skill-fetcher.ts  # スキルデータ取得
│   ├── tools/                # MCPツール層
│   │   └── handlers/         # 各ツールの実装
│   └── server/               # サーバーセットアップ
├── data/
│   └── recommendations.json  # 統合データベース
├── scripts/
│   └── fetch-data.ts         # データ更新スクリプト
├── tests/                    # テストファイル
├── .husky/                   # Git hooks
├── docs/                     # 技術ドキュメント
│   └── ARCHITECTURE.md      # アーキテクチャドキュメント
├── CLAUDE.md                 # 開発ガイドライン（重要！）
├── CONTRIBUTING.md           # コントリビューションガイド
├── CHANGELOG.md              # 変更履歴
├── biome.json               # Biome設定
├── tsconfig.json            # TypeScript設定
└── package.json             # プロジェクト設定
```

## コーディング規約

**重要**: 詳細なコーディング規約とアーキテクチャガイドラインは [CLAUDE.md](./CLAUDE.md) を参照してください。

### 重要なルール

1. **index.ts は原則禁止** - ただし `types/` と `tools/handlers/` のみ例外
2. **type を使用** - interface は使用しない
3. **レイヤー間の依存方向を守る** - 上位→下位のみ
4. **単一責任の原則** - ファイルは1つの責務のみを持つ

### 命名規則

- **ファイル**: kebab-case + suffix (`plugin-fetcher.service.ts`)

## データ更新

新しいデータソースを追加する場合：

1. `scripts/fetch-data.ts`にフェッチャー追加
2. `src/types/`に型定義追加（domain-types.ts, raw-types.ts など）
3. `src/types/index.ts`で公開APIとしてエクスポート
4. テスト実行

```bash
pnpm run fetch-data
pnpm run build
pnpm run check
```

## 質問・サポート

- **Issue**: バグ報告・機能要望は[GitHub Issues](https://github.com/your-username/cc-recommender/issues)
- **Discussion**: 質問・議論は[GitHub Discussions](https://github.com/your-username/cc-recommender/discussions)

## ライセンス

貢献することで、あなたのコードがMITライセンスでリリースされることに同意したものとみなされます。
