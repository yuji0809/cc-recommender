---
name: tdd
description: "Test-Driven Development (TDD) のベストプラクティスとガイドライン"
tags: ["testing", "tdd", "vitest", "quality"]
---

# TDD スキル

## テスト駆動開発の原則

### 1. Red-Green-Refactor サイクル

1. **Red（失敗するテストを書く）**
   - 実装前にテストを書く
   - テストが失敗することを確認

2. **Green（テストを通す最小限の実装）**
   - テストを通すための最小限のコードを書く
   - 完璧な実装は後回し

3. **Refactor（リファクタリング）**
   - テストを保ちながらコードを改善
   - 重複を排除
   - 読みやすさを向上

### 2. テストの原則

**FIRST 原則:**
- **F**ast: テストは高速であること
- **I**ndependent: テスト間で独立していること
- **R**epeatable: 何度実行しても同じ結果
- **S**elf-validating: 合否が自動的に判定される
- **T**imely: 実装の前にテストを書く

### 3. テストの構造（AAA パターン）

```typescript
test("should do something", () => {
  // Arrange（準備）
  const input = setupTestData();

  // Act（実行）
  const result = functionUnderTest(input);

  // Assert（検証）
  expect(result).toBe(expectedValue);
});
```

### 4. このプロジェクトのテスト規約

**テストファイルの配置:**
```
tests/
├── analyzer.test.ts
├── recommender.test.ts
└── fetchers.test.ts
```

**テストの命名規則:**
```typescript
describe("機能名", () => {
  describe("関数名", () => {
    test("should 期待される動作", () => {
      // テスト内容
    });
  });
});
```

**必須テストケース:**
1. 正常系（Happy Path）
2. 境界値テスト
3. エラーハンドリング
4. エッジケース

**テストカバレッジ:**
- 新規コードは高いカバレッジを維持
- 重要なロジックは必ずテストを書く

### 5. モック・スタブの使用

**テンポラリディレクトリの使用:**
```typescript
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tempDir: string;

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "test-prefix-"));
  // テストデータを準備
});

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true });
});
```

### 6. チェックリスト

新機能を追加する際は以下を確認：

- [ ] テストを先に書いたか？
- [ ] テストが失敗することを確認したか？
- [ ] 最小限の実装でテストを通したか？
- [ ] リファクタリングを行ったか？
- [ ] 正常系のテストを書いたか？
- [ ] エラーケースのテストを書いたか？
- [ ] 境界値のテストを書いたか？
- [ ] `pnpm run test` が通るか？
- [ ] カバレッジは十分か？

### 7. アンチパターン

❌ **避けるべきこと:**
- テストを後から書く
- 実装とテストを同時に書く
- テストが大きすぎる（複数の責務をテスト）
- テスト間で状態を共有する
- 不安定なテスト（Flaky Tests）

✅ **推奨すること:**
- 小さく独立したテスト
- 明確な期待値
- 意味のあるテスト名
- テストの可読性を重視
