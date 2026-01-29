# タスク完了時のチェックリスト

## コード変更後の必須チェック

### 1. 型チェック

```bash
npm run typecheck
```

- TypeScriptコンパイルエラーがないことを確認
- strict mode有効なので、すべての型が正しいことを保証

### 2. ビルド成功確認

```bash
npm run build
```

- `dist/` ディレクトリにファイルが生成されることを確認
- ビルドエラーがないことを確認

### 3. MCPサーバー動作確認

```bash
npm start
```

または Claude Codeで実際にテスト:
- Claude Codeを再起動
- 5つのツールが使えることを確認:
  - `recommend_skills`
  - `search_skills`
  - `get_skill_details`
  - `list_categories`
  - `get_stats`

### 4. データベース整合性確認（データ変更時のみ）

```bash
npm run fetch-data
```

- `data/recommendations.json` が正しく生成されることを確認
- JSONフォーマットが正しいことを確認:
  ```bash
  cat data/recommendations.json | python3 -m json.tool
  ```

## コード品質チェック（推奨）

### コードスタイル
- [ ] 命名規則に従っている（camelCase, PascalCase, UPPER_SNAKE_CASE）
- [ ] インポートに`node:`プレフィックス使用
- [ ] ESMなので`.js`拡張子使用（型インポートでも）
- [ ] 関数に型定義が明示されている

### エラーハンドリング
- [ ] try-catchブロックで適切にエラーハンドリング
- [ ] エラーメッセージが分かりやすい
- [ ] `console.error`でエラー出力（stderrに）

### コメント
- [ ] ファイルヘッダーコメントがある
- [ ] 複雑なロジックにコメントがある
- [ ] public関数にJSDocコメントがある

## 新機能追加時の追加チェック

### 1. 型定義更新
- `src/types/index.ts` に新しい型を追加
- Zodスキーマも更新（バリデーション用）

### 2. ツール追加
- `src/tools/index.ts` にツール実装
- `src/index.ts` でMCPサーバーに登録
- ツール説明を日本語で記述

### 3. ドキュメント更新
- `README.md` の「提供ツール」セクション更新
- 使用例を追加

## データソース変更時のチェック

### 1. Fetcher更新
- `src/services/*-fetcher.ts` の対象ファイル更新
- パースロジックが正しいことを確認

### 2. データ取得テスト
```bash
npm run fetch-data
```
- エラーがないことを確認
- アイテム数が想定通りであることを確認

### 3. 統計確認
- プラグイン数
- MCPサーバー数
- スキル/ワークフロー/フック/コマンド/エージェント数

## リリース前チェック

### 1. バージョン更新
- `package.json` のバージョン番号
- `src/index.ts` のMCPサーバーバージョン

### 2. ビルド成果物確認
```bash
npm run build
ls -la dist/
```

### 3. npm publish準備（将来）
- `package.json` の `files` フィールド確認
- `dist/` と `data/` が含まれることを確認

## Git コミット前チェック

- [ ] 型チェック通過
- [ ] ビルド成功
- [ ] 不要なファイルが含まれていない（`.gitignore`確認）
- [ ] コミットメッセージが分かりやすい
