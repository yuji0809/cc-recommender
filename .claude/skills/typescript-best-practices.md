---
name: typescript-best-practices.md
description: "TypeScript のベストプラクティスとコーディング規約"
tags: ["typescript", "best-practices", "code-quality", "type-safety"]
---

# TypeScript ベストプラクティス スキル

## TypeScript コーディング規約

### 1. 型安全性

**型推論を活用:**
```typescript
// ✅ 型推論に任せる
const name = "John"; // string と推論される
const count = 42; // number と推論される

// ❌ 不要な型注釈
const name: string = "John";
```

**any は避ける:**
```typescript
// ❌ any の使用
function process(data: any) {
  return data.value;
}

// ✅ 具体的な型を定義
type Data = {
  value: string;
};

function process(data: Data) {
  return data.value;
}

// ✅ unknown を使用（型ガードと組み合わせ）
function process(data: unknown) {
  if (typeof data === "object" && data !== null && "value" in data) {
    return (data as Data).value;
  }
  throw new Error("Invalid data");
}
```

### 2. 型定義

**type vs interface:**
```typescript
// ✅ このプロジェクトでは type を使用
export type User = {
  id: string;
  name: string;
};

// ❌ interface は使用しない
export interface User {
  id: string;
  name: string;
}
```

**ユニオン型の活用:**
```typescript
// ✅ 明確な状態管理
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// 型ガードで安全にアクセス
if (result.success) {
  console.log(result.data); // OK
} else {
  console.log(result.error); // OK
}
```

**readonly の活用:**
```typescript
// ✅ 読み取り専用プロパティ
type Config = {
  readonly apiKey: string;
  readonly maxRetries: number;
};

// ✅ 読み取り専用配列
type Items = readonly string[];
```

### 3. 関数の型定義

**関数の型注釈:**
```typescript
// ✅ 引数と戻り値の型を明示
function calculateScore(
  dependencies: string[],
  frameworks: string[]
): number {
  return dependencies.length + frameworks.length;
}

// ✅ async 関数
async function fetchData(url: string): Promise<Data> {
  const response = await fetch(url);
  return response.json();
}
```

**型安全なエラーハンドリング:**
```typescript
// ✅ 例外をキャッチして安全に処理
try {
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content);
} catch (error) {
  // error は unknown 型
  if (error instanceof Error) {
    console.error("Error:", error.message);
  }
  return null;
}
```

### 4. ジェネリクス

**再利用可能な型:**
```typescript
// ✅ ジェネリクスで柔軟な型定義
type Response<T> = {
  data: T;
  timestamp: number;
};

type UserResponse = Response<User>;
type ItemsResponse = Response<Item[]>;
```

**制約付きジェネリクス:**
```typescript
// ✅ extends で型制約
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// 型安全にプロパティアクセス
const user = { id: "1", name: "John" };
const name = getProperty(user, "name"); // OK
// const invalid = getProperty(user, "invalid"); // エラー
```

### 5. 非同期処理

**Promise の型定義:**
```typescript
// ✅ Promise の型を明示
async function fetchUsers(): Promise<User[]> {
  const response = await fetch("/api/users");
  const data: unknown = await response.json();

  // バリデーション
  if (!Array.isArray(data)) {
    throw new Error("Invalid response");
  }

  return data as User[];
}
```

**並列処理:**
```typescript
// ✅ Promise.all で並列実行
const [users, items] = await Promise.all([
  fetchUsers(),
  fetchItems(),
]);

// ✅ Promise.allSettled でエラーハンドリング
const results = await Promise.allSettled([
  fetchUsers(),
  fetchItems(),
]);

for (const result of results) {
  if (result.status === "fulfilled") {
    console.log(result.value);
  } else {
    console.error(result.reason);
  }
}
```

### 6. 配列操作

**型安全な配列メソッド:**
```typescript
// ✅ filter で型を絞り込み
const numbers: (number | string)[] = [1, "2", 3, "4"];
const onlyNumbers = numbers.filter((n): n is number => typeof n === "number");
// onlyNumbers は number[] 型

// ✅ map で型変換
const users: User[] = [...];
const userNames: string[] = users.map(user => user.name);

// ✅ reduce で集約
const total: number = numbers.reduce((sum, n) => sum + n, 0);
```

### 7. オブジェクト操作

**分割代入:**
```typescript
// ✅ 分割代入で必要なプロパティのみ取得
const { name, email } = user;

// ✅ デフォルト値
const { role = "user" } = user;

// ✅ レスト演算子
const { id, ...rest } = user;
```

**オブジェクトのスプレッド:**
```typescript
// ✅ イミュータブルな更新
const updatedUser = {
  ...user,
  name: "New Name",
};

// ✅ オブジェクトのマージ
const merged = { ...defaults, ...userOptions };
```

### 8. 型ガード

**カスタム型ガード:**
```typescript
// ✅ 型述語（Type Predicate）
function isString(value: unknown): value is string {
  return typeof value === "string";
}

// 使用例
if (isString(value)) {
  console.log(value.toUpperCase()); // OK: value は string
}
```

**Discriminated Unions:**
```typescript
// ✅ タグ付きユニオン型
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
  }
}
```

### 9. Null/Undefined の扱い

**Optional Chaining:**
```typescript
// ✅ Optional Chaining で安全にアクセス
const name = user?.profile?.name;

// ✅ Nullish Coalescing でデフォルト値
const displayName = name ?? "Anonymous";
```

**Non-null Assertion は避ける:**
```typescript
// ❌ Non-null Assertion (!)
const value = map.get(key)!;

// ✅ 型ガードで確認
const value = map.get(key);
if (value !== undefined) {
  // value を使用
}
```

### 10. このプロジェクトの規約

**Zod によるランタイムバリデーション:**
```typescript
// ✅ Zodスキーマで型とバリデーションを統一
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;

// バリデーション
const user = UserSchema.parse(data);
```

**パスの扱い:**
```typescript
// ✅ Node.js の path モジュールを使用
import { join, resolve } from "node:path";

const filePath = join(projectPath, "package.json");
```

**ファイル操作:**
```typescript
// ✅ node:fs/promises を使用
import { readFile, writeFile } from "node:fs/promises";

// 非同期で処理
const content = await readFile(filePath, "utf-8");
```

### 11. チェックリスト

**コードレビュー時の確認:**

- [ ] `any` を使用していないか？
- [ ] `interface` ではなく `type` を使用しているか？
- [ ] 型推論を適切に活用しているか？
- [ ] 非同期処理の型は正しいか？
- [ ] エラーハンドリングは型安全か？
- [ ] Optional Chaining / Nullish Coalescing を活用しているか？
- [ ] ジェネリクスは適切に使用されているか？
- [ ] 型ガードは正しく実装されているか？
- [ ] `pnpm run typecheck` が通るか？

### 12. アンチパターン

❌ **避けるべきパターン:**
```typescript
// any の乱用
function process(data: any) { ... }

// 不要な型注釈
const name: string = "John";

// Non-null Assertion
const value = obj!.prop!;

// interface の使用（このプロジェクトでは禁止）
interface User { ... }
```

✅ **推奨パターン:**
```typescript
// 具体的な型定義
type Data = { value: string };
function process(data: Data) { ... }

// 型推論
const name = "John";

// 型ガード
if (obj?.prop) {
  const value = obj.prop;
}

// type の使用
type User = { ... };
```

### 13. リソース

**参考資料:**
- [TypeScript 公式ドキュメント](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- プロジェクト内の既存コードを参考に
