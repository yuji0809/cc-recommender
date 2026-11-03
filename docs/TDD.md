# TDD ガイド

cc-recommender では、新しい機能はテストを先に書いてから実装します（[CLAUDE.md](../CLAUDE.md) のルールです）。バグ修正も、バグを再現するテストを先に書いて失敗を確認してから直すことを勧めます。このドキュメントでは、このリポジトリでの進め方を実例でまとめます。

## テストの置き場所と書き方

テストは Vitest で書き、`tests/` に置きます（`vitest.config.ts` の対象は `**/*.test.ts`）。新しいテストは `src/` と同じパスに置きます。たとえば `src/utils/github-url.ts` のテストは `tests/utils/github-url.test.ts` です。`tests/analyzer/`、`tests/fetchers/`、`tests/recommender/` は以前からある機能別のディレクトリなので、そこにある既存テストへの追加はそのまま同じファイルに書いて構いません。

`describe` / `it` / `expect` は `vitest` から明示的に import します。設定は `globals: true` ですが、既存のテストはすべて import しています。実装は相対パスに拡張子 `.js` を付けて import します（`moduleResolution` が `NodeNext` のため）。

```typescript
import { describe, expect, it } from "vitest";
import { isGitHubUrl } from "../../src/utils/github-url.js";
```

`describe` の中は `Normal Cases` / `Edge Cases` / `Error Cases` に分けて書きます。

## Red / Green / Refactor の実例

例として `src/utils/github-url.ts` の `isGitHubUrl` を使います。`scripts/fetch-data.ts` では GitHub の URL かどうかを `url.includes("github.com")` で判定していて、CodeQL に `js/incomplete-url-substring-sanitization` として指摘されていました。この判定を、URL をパースする関数に置き換える流れで説明します。

### Red

先にテストを書きます。`includes("github.com")` で通ってしまう URL を Error Cases に入れておくのがポイントです。

```typescript
// tests/utils/github-url.test.ts
describe("isGitHubUrl", () => {
  describe("Normal Cases", () => {
    it("should accept a GitHub repository URL", () => {
      expect(isGitHubUrl("https://github.com/owner/repo")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should reject an empty string", () => {
      expect(isGitHubUrl("")).toBe(false);
    });

    it("should reject non-https protocols", () => {
      expect(isGitHubUrl("http://github.com/owner/repo")).toBe(false);
    });
  });

  describe("Error Cases (host confusion)", () => {
    it("should reject hosts that merely contain github.com", () => {
      expect(isGitHubUrl("https://github.com.evil.example/owner/repo")).toBe(false);
    });

    it("should reject github.com appearing only in userinfo", () => {
      expect(isGitHubUrl("https://github.com@evil.example/owner/repo")).toBe(false);
    });
  });
});
```

ウォッチモードで動かし、失敗することを確認します。この時点では `src/utils/github-url.ts` がないので、import の段階で失敗します。

```bash
pnpm run test:watch tests/utils/github-url.test.ts
```

### Green

テストが通る最小限の実装を書きます。`url.includes("github.com")` をそのまま関数にしただけでは Error Cases が落ちるので、URL をパースしてプロトコルとホスト名を比較します。

```typescript
// src/utils/github-url.ts
export function isGitHubUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "github.com";
  } catch {
    return false;
  }
}
```

### Refactor

テストが通った状態を保ったまま、コードを整理します。この例では `scripts/fetch-data.ts` の `.filter((item) => item.url.includes("github.com"))` を `.filter((item) => isGitHubUrl(item.url))` に置き換えました。整理が終わったら、全テストと型チェック、Lint を通します。

```bash
pnpm run test && pnpm run typecheck && pnpm run lint
```

## 外部 I/O のモック

fetcher や repository は GitHub API やリモートのデータを取得しますが、テストからネットワークには出しません。既存のテストでは次の 2 つの方法を使っています。

- モジュールごと差し替える。`tests/fetchers/direct-skill-fetcher.test.ts` は `vi.mock("../../src/services/fetchers/skills/common/github-api.js", ...)` で GitHub API の呼び出しを差し替えています。
- グローバルの `fetch` を差し替える。`tests/repositories/remote-data.repository.test.ts` は次のようにしています。

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("fetchRemoteData", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  // ...
});
```

`tests/fetchers/mcp-fetcher.test.ts` などの古いテストは `global.fetch = vi.fn()` と直接代入していますが、新しく書くときは `vi.stubGlobal` を使ってください。`vi.unstubAllGlobals()` で元に戻せるので、他のテストに影響が残りません。

## コマンド

```bash
pnpm run test:watch                            # 変更のたびに再実行
pnpm run test tests/utils/github-url.test.ts   # 1 ファイルだけ実行
pnpm run test                                  # 全テスト
pnpm run test:coverage                         # coverage/ にレポートを出力（text, json, html）
```

カバレッジの閾値は設定していません。CI の `Code Quality` ジョブは `pnpm run test:coverage` の結果を Codecov にアップロードしますが、カバレッジが低くてもジョブは落ちません。追加した分岐がテストされているかは、レポートを見て確認してください。

pre-commit フックはテストを実行しません。コミット前に自分で実行してください。

```bash
pnpm run check   # typecheck, lint, audit, license:check
pnpm run test
```

## チェックリスト

- [ ] テストを先に書き、失敗することを確認した
- [ ] 正常系に加えて、空の入力や不正な入力のケースを書いた
- [ ] テストが通る最小限の実装にした
- [ ] リファクタリングの後も `pnpm run test` が通る
- [ ] `pnpm run check` が通る
- [ ] テストからネットワークに出ていない
