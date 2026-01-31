---
name: security-check
description: "セキュリティベストプラクティスとコードレビューガイドライン"
tags: ["security", "best-practices", "audit", "safety"]
---

# セキュリティチェック スキル

## セキュリティ原則

### 1. 機密情報の保護

**禁止事項:**
- ❌ `.env` ファイルの直接読み取り
- ❌ APIキー、パスワード、トークンのハードコード
- ❌ 機密情報のログ出力
- ❌ 機密情報のGitコミット

**推奨事項:**
- ✅ `.env.example` など、テンプレートファイルのみ読み取る
- ✅ 環境変数から機密情報を取得
- ✅ `.gitignore` に機密ファイルを追加
- ✅ セキュリティスキャンツールの使用

### 2. 入力バリデーション

**必須チェック:**
```typescript
// ✅ Zodでバリデーション
import { z } from "zod";

const schema = z.object({
  path: z.string().min(1),
  limit: z.number().int().positive().optional(),
});

// 入力を検証
const validated = schema.parse(input);
```

**ファイルパス検証:**
```typescript
// ✅ パストラバーサル対策
import { join, resolve } from "node:path";

function safeFilePath(basePath: string, userPath: string): string {
  const fullPath = resolve(basePath, userPath);
  if (!fullPath.startsWith(resolve(basePath))) {
    throw new Error("Invalid path");
  }
  return fullPath;
}
```

### 3. コマンドインジェクション対策

**危険なパターン:**
```typescript
// ❌ シェルコマンドに直接ユーザー入力を使用
exec(`git clone ${userInput}`);
```

**安全なパターン:**
```typescript
// ✅ 引数を配列で渡す
import { spawn } from "node:child_process";

spawn("git", ["clone", userInput]);
```

### 4. 依存関係のセキュリティ

**このプロジェクトのセキュリティツール:**

```bash
# セキュリティ監査（自動スキャン）
pnpm run audit

# ベースライン作成
pnpm run audit:baseline

# 変更検知
pnpm run audit:drift

# ライセンスチェック
pnpm run license:check
```

**許可されたライセンス:**
- MIT
- Apache-2.0
- BSD-2-Clause / BSD-3-Clause
- ISC
- 0BSD
- CC0-1.0
- Unlicense

### 5. ファイル操作のセキュリティ

**安全なファイル読み取り:**
```typescript
// ✅ try-catchでエラーハンドリング
try {
  const content = await readFile(filePath, "utf-8");
  // 処理
} catch {
  // ファイルが存在しない場合の処理
  // エラー詳細をログに出さない
}
```

**一時ファイルの使用:**
```typescript
// ✅ mkdtempでセキュアな一時ディレクトリ
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempDir = await mkdtemp(join(tmpdir(), "prefix-"));
try {
  // 一時ファイルを使用
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
```

### 6. 正規表現のセキュリティ（ReDoS対策）

**危険なパターン:**
```typescript
// ❌ 指数的バックトラッキング
const regex = /(a+)+b/;
```

**安全なパターン:**
```typescript
// ✅ 具体的な量指定子
const regex = /a{1,100}b/;

// ✅ 非貪欲マッチ
const regex = /a+?b/;
```

### 7. セキュリティチェックリスト

**コードレビュー時の確認項目:**

- [ ] 機密情報が含まれていないか？
  - [ ] `.env` ファイルを読んでいないか？
  - [ ] APIキーがハードコードされていないか？
  - [ ] パスワードがコードに含まれていないか？

- [ ] 入力バリデーションは適切か？
  - [ ] Zodでバリデーションしているか？
  - [ ] ファイルパスは検証されているか？
  - [ ] 数値の範囲チェックはあるか？

- [ ] コマンドインジェクション対策はあるか？
  - [ ] シェルコマンドは安全に実行されているか？
  - [ ] ユーザー入力は適切にエスケープされているか？

- [ ] 依存関係は安全か？
  - [ ] `pnpm run audit` が通るか？
  - [ ] ライセンスチェックが通るか？
  - [ ] 最新の脆弱性情報を確認したか？

- [ ] ファイル操作は安全か？
  - [ ] エラーハンドリングは適切か？
  - [ ] パストラバーサルの脆弱性はないか？
  - [ ] 一時ファイルは適切にクリーンアップされるか？

- [ ] 正規表現は安全か？
  - [ ] ReDoSの脆弱性はないか？
  - [ ] 複雑すぎる正規表現はないか？

### 8. セキュリティインシデント対応

**問題を発見した場合:**
1. GitHub Security Advisories で報告
2. 詳細は公開せず、メンテナーに連絡
3. 修正が完了するまで情報を秘匿

**セキュリティ情報:**
- [SECURITY.md](../../SECURITY.md) を参照
- Dependabot、CodeQL を活用
- 定期的なセキュリティ監査

### 9. アンチパターン

❌ **絶対にやってはいけないこと:**
```typescript
// 機密情報のログ出力
console.log("API Key:", process.env.API_KEY);

// 機密情報のエラーメッセージ
throw new Error(`Failed with key: ${apiKey}`);

// SQLインジェクション
db.query(`SELECT * FROM users WHERE name = '${userName}'`);

// コマンドインジェクション
exec(`rm -rf ${userInput}`);
```

✅ **推奨パターン:**
```typescript
// ログは最小限に
console.error("API request failed");

// エラーメッセージに機密情報を含めない
throw new Error("Authentication failed");

// パラメータ化クエリ
db.query("SELECT * FROM users WHERE name = ?", [userName]);

// 安全なコマンド実行
spawn("rm", ["-rf", sanitizedPath]);
```
