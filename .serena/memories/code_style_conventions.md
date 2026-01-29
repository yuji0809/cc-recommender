# コードスタイルと規約

## 命名規則

### ファイル命名
- **kebab-case**: `plugin-fetcher.ts`, `mcp-fetcher.ts`, `skill-fetcher.ts`
- **index.ts**: 各ディレクトリのエントリーポイント

### 変数・関数命名
- **camelCase**: 変数名、関数名
  - 例: `loadDatabase`, `analyzeProject`, `recommendSkills`
- **PascalCase**: 型名、インターフェース名
  - 例: `Recommendation`, `ProjectInfo`, `RecommendationDatabase`
- **UPPER_SNAKE_CASE**: 定数
  - 例: `DATABASE_PATH`, `EXTENSION_TO_LANGUAGE`, `CONFIG_FILE_MAPPINGS`

## TypeScript規約

### 型定義
- **明示的な型定義**: すべてのexport関数に戻り値型を明示
  ```typescript
  async function loadDatabase(): Promise<RecommendationDatabase>
  ```
- **interfaceとtype**: データ構造はinterface、ユニオン型はtype
  ```typescript
  export interface Recommendation { ... }
  export type RecommendationType = "plugin" | "mcp" | "skill" | ...
  ```

### インポート
- **Node.js組み込みモジュール**: `node:`プレフィックス使用
  ```typescript
  import { readFile } from "node:fs/promises";
  import { dirname, join } from "node:path";
  ```
- **拡張子**: ESMなので`.js`拡張子必須（TypeScriptファイルでも）
  ```typescript
  import type { RecommendationDatabase } from "./types/index.js";
  ```

### 型安全性
- **strict mode**: 有効化済み
- **any使用**: 最小限に（MCPパラメータの型変換のみ）
- **nullチェック**: 明示的に実施

## コメント規約

### ファイルヘッダー
```typescript
/**
 * Short description
 * 
 * Detailed description if needed
 */
```

### 関数コメント
```typescript
/**
 * Function description
 * 
 * @param paramName - Description
 * @returns Description
 */
```

### セクションコメント
```typescript
// 1. Load database
// 2. Process items
// Register tools
```

## エラーハンドリング

### try-catchパターン
```typescript
try {
  const result = await operation();
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
} catch (error) {
  return {
    content: [{
      type: "text",
      text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`
    }],
    isError: true,
  };
}
```

### エラーログ
- **console.error**: エラー出力（stderrに出力）
- **process.exit(1)**: 致命的エラー時

## コード構造パターン

### シングルレスポンシビリティ
- 各ファイルは単一の責務を持つ
- `analyzer.ts` - プロジェクト分析のみ
- `recommender.ts` - スコア計算と推薦のみ
- `*-fetcher.ts` - データ取得のみ

### 関数の粒度
- 小さく、テスタブルな関数
- 例: `parsePackageJson`, `parseGoMod`, `shouldSkipDirectory`

## Zodスキーマ

```typescript
export const recommendSkillsSchema = z.object({
  project_path: z.string().optional(),
  types: z.array(z.enum(["plugin", "mcp", "skill", ...])).optional(),
  max_results: z.number().optional(),
  description: z.string().optional(),
});
```

## 日本語コメント

- ツール説明、エラーメッセージは日本語OK
- コード内コメント、変数名は英語
