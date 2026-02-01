# TDD (Test-Driven Development) Guide

## TDD開発サイクル

cc-recommender では、新機能の実装に **Test-Driven Development (TDD)** を適用します。

### TDDの3ステップ

```
1. 🔴 Red:   失敗するテストを書く
2. 🟢 Green: テストを通す最小限のコードを書く
3. 🔵 Refactor: コードをリファクタリング
```

このサイクルを繰り返すことで、品質の高いコードを段階的に構築します。

---

## TDDのメリット

### 1. **設計の改善**
- テストを先に書くことで、APIの使いやすさを事前に検証
- インターフェースがシンプルで明確になる

### 2. **バグの早期発見**
- 実装前にテストケースを整理
- エッジケースを考慮した設計

### 3. **リファクタリングの安全性**
- テストがあるため、リファクタリング時の安心感
- 既存機能を壊さないことを保証

### 4. **ドキュメントとしての役割**
- テストコードが使用例になる
- 期待される動作が明確

---

## TDD実践ガイド

### ステップ1: Red（失敗するテストを書く）

**目的:** 何を実装するかを明確にする

```typescript
// tests/services/example.test.ts
describe("calculateSimilarity", () => {
  it("should calculate Jaccard similarity correctly", () => {
    const result = calculateSimilarity(["a", "b"], ["b", "c"]);
    expect(result).toBe(0.33); // |{b}| / |{a,b,c}| = 1/3
  });
});
```

**チェックポイント:**
- [ ] テストケースが明確
- [ ] 期待される動作が具体的
- [ ] エッジケースを考慮

**実行:**
```bash
pnpm run test:watch
```

→ テストが失敗することを確認（関数がまだ存在しないため）

---

### ステップ2: Green（テストを通す最小限のコード）

**目的:** テストを通すための最小限の実装

```typescript
// src/services/example.ts
export function calculateSimilarity(set1: string[], set2: string[]): number {
  const intersection = set1.filter(x => set2.includes(x)).length;
  const union = new Set([...set1, ...set2]).size;
  return Math.round((intersection / union) * 100) / 100;
}
```

**チェックポイント:**
- [ ] テストが通る
- [ ] 最小限の実装（過剰な実装をしない）
- [ ] ハードコードではない

**実行:**
```bash
pnpm run test
```

→ テストが成功することを確認

---

### ステップ3: Refactor（リファクタリング）

**目的:** コードの品質を向上させる

```typescript
// リファクタリング例
export function calculateSimilarity(set1: string[], set2: string[]): number {
  // 正規化して大文字小文字を統一
  const normalize = (arr: string[]) => arr.map(s => s.toLowerCase());

  const s1 = normalize(set1);
  const s2 = normalize(set2);

  const intersection = s1.filter(x => s2.includes(x)).length;
  const union = new Set([...s1, ...s2]).size;

  return Math.round((intersection / union) * 100) / 100;
}
```

**チェックポイント:**
- [ ] テストが全て通る
- [ ] コードが読みやすい
- [ ] 重複が排除されている
- [ ] パフォーマンスが適切

**実行:**
```bash
pnpm run test && pnpm run typecheck
```

---

## TDD実践例：フェーズ3（意味的類似性）

### 実装する機能

1. **共起行列の構築** (`buildSimilarityMatrix`)
2. **Jaccard係数の計算** (`calculateJaccardSimilarity`)
3. **類似性スコアの計算** (`calculateSimilarityScore`)
4. **プロジェクトタグの抽出** (`extractProjectTags`)

### TDDサイクルでの実装順序

#### 機能1: プロジェクトタグの抽出（最も基本的）

**🔴 Red: テストを書く**
```typescript
describe("extractProjectTags", () => {
  it("should extract languages as tags", () => {
    const project = { languages: ["typescript", "javascript"], ... };
    const tags = extractProjectTags(project);
    expect(tags).toContain("typescript");
    expect(tags).toContain("javascript");
  });
});
```

**🟢 Green: 実装**
```typescript
export function extractProjectTags(project: ProjectInfo): string[] {
  return [...project.languages];
}
```

**🔵 Refactor: フレームワークも追加**
```typescript
export function extractProjectTags(project: ProjectInfo): string[] {
  return [...project.languages, ...project.frameworks];
}
```

---

#### 機能2: Jaccard係数の計算

**🔴 Red: 複数のテストケースを書く**
```typescript
describe("calculateJaccardSimilarity", () => {
  it("should return 1 for identical sets", () => {
    expect(calculateJaccardSimilarity("a", "a", ...)).toBe(1.0);
  });

  it("should return 0 for disjoint sets", () => {
    expect(calculateJaccardSimilarity("a", "b", ...)).toBe(0);
  });

  it("should calculate correctly for partial overlap", () => {
    // {a,b} ∩ {b,c} = {b}, union = {a,b,c}
    // Jaccard = 1/3 ≈ 0.33
    expect(calculateJaccardSimilarity("a", "b", ...)).toBeCloseTo(0.33);
  });
});
```

**🟢 Green: 実装**
**🔵 Refactor: エッジケースを処理**

---

#### 機能3: 共起行列の構築

**🔴 Red: テストを書く**
```typescript
describe("buildSimilarityMatrix", () => {
  it("should count tag co-occurrences", () => {
    const db = {
      items: [
        { tags: ["react", "testing"] },
        { tags: ["react", "nextjs"] },
      ]
    };
    const matrix = buildSimilarityMatrix(db);

    expect(matrix.cooccurrence.get("react")?.get("testing")).toBe(1);
    expect(matrix.tagCounts.get("react")).toBe(2);
  });
});
```

**🟢 Green: 実装**
**🔵 Refactor: パフォーマンス最適化**

---

## テストの構造化

### 良いテストの条件（FIRST原則）

- **F**ast: 高速に実行できる
- **I**ndependent: 独立している（他のテストに依存しない）
- **R**epeatable: 繰り返し実行可能
- **S**elf-validating: 自己検証（手動確認不要）
- **T**imely: タイムリー（実装前に書く）

### テストケースの網羅

```typescript
describe("Feature", () => {
  describe("Normal Cases", () => {
    it("should handle typical input");
    it("should handle multiple items");
  });

  describe("Edge Cases", () => {
    it("should handle empty input");
    it("should handle single item");
    it("should handle duplicate values");
  });

  describe("Error Cases", () => {
    it("should handle invalid input gracefully");
    it("should throw error for null input");
  });
});
```

---

## テストコマンド

### 開発中
```bash
# ウォッチモード（ファイル変更時に自動実行）
pnpm run test:watch

# 特定のファイルのみ
pnpm run test path/to/test.ts
```

### 実装完了後
```bash
# 全テスト実行
pnpm run test

# カバレッジ確認
pnpm run test:coverage

# 型チェック + Lint + テスト
pnpm run check && pnpm run test
```

---

## TDDチェックリスト

### 新機能実装時

- [ ] **Step 1: テストを先に書く**
  - [ ] 正常系のテストケース
  - [ ] エッジケースのテストケース
  - [ ] エラーケースのテストケース
  - [ ] テストが失敗することを確認

- [ ] **Step 2: 実装**
  - [ ] テストを通す最小限のコード
  - [ ] 過剰な実装をしない
  - [ ] テストが全て通ることを確認

- [ ] **Step 3: リファクタリング**
  - [ ] コードの重複を削除
  - [ ] 命名を改善
  - [ ] パフォーマンスを最適化
  - [ ] テストが全て通ることを再確認

- [ ] **Step 4: コミット**
  - [ ] 型チェックが通る
  - [ ] Lintが通る
  - [ ] 全テストが通る
  - [ ] 意味のあるコミットメッセージ

---

## TDDのアンチパターン

### ❌ 避けるべきこと

1. **実装を先に書いてからテストを書く**
   - テストが実装に引きずられる
   - テストが形骸化

2. **テストをスキップする**
   - 「後で書く」は書かれない
   - バグが増える

3. **過剰なモック**
   - テストが実装の詳細に依存
   - リファクタリングが困難

4. **テストが多すぎる**
   - メンテナンスコストが高い
   - 重要なテストが埋もれる

### ✅ 推奨されること

1. **小さく始める**
   - 1つの機能に対して1つのテスト
   - 段階的に拡張

2. **テストを読みやすく**
   - AAA（Arrange-Act-Assert）パターン
   - わかりやすい変数名

3. **適切な粒度**
   - 単体テスト: 関数レベル
   - 統合テスト: モジュール間の連携

---

## 参考資料

- [Vitest Documentation](https://vitest.dev/)
- [Test Driven Development (Kent Beck)](https://www.amazon.com/dp/0321146530)
- [Growing Object-Oriented Software, Guided by Tests](https://www.amazon.com/dp/0321503627)

---

## まとめ

TDDは **設計手法** であり、単なるテスト手法ではありません。

**Red → Green → Refactor** のサイクルを回すことで：
- 品質の高いコード
- 保守しやすいコード
- 自信を持ってリファクタリングできるコード

を継続的に生み出すことができます。
