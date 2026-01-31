---
name: architecture-check
description: "プロジェクトのアーキテクチャと設計思想の確認"
tags: ["architecture", "design", "best-practices", "layered-architecture"]
---

# アーキテクチャチェック スキル

## プロジェクトの設計思想

このプロジェクトは **レイヤードアーキテクチャ** を採用しています。
詳細は [CLAUDE.md](../../CLAUDE.md) を参照してください。

### 1. レイヤードアーキテクチャ

```
presentation (tools) → business logic (services) → data access (repositories)
                    ↓
                 config, utils, types
```

**依存関係のルール:**
- ✅ 上位レイヤーは下位レイヤーに依存できる
- ❌ 下位レイヤーは上位レイヤーに依存してはいけない
- ⚠️ 同一レイヤー内での依存は最小限に

### 2. ディレクトリ構造

```
src/
├── config/              # 設定（定数、マッピング）
├── repositories/        # データアクセス層
├── utils/              # 共通ユーティリティ
├── types/              # 型定義（index.ts 使用可）
├── schemas/            # Zodバリデーションスキーマ
├── services/           # ビジネスロジック層
│   ├── analyzer/       # プロジェクト分析
│   │   └── parsers/    # 言語別パーサー
│   └── recommender/    # 推薦ロジック
├── tools/              # プレゼンテーション層
│   └── handlers/       # MCPツール（index.ts 使用可）
└── server/             # MCPサーバー設定
```

### 3. ファイル命名規則

**パターン:**
```
<name>.<type>.ts
```

**タイプ別のsuffix:**
- `.service.ts` - サービス層
- `.repository.ts` - データアクセス層
- `.tool.ts` - MCPツール
- `.parser.ts` - パーサー
- `.types.ts` - 型定義
- `-config.ts` - 設定ファイル

**例:**
```
✅ project-analyzer.service.ts
✅ recommendation.repository.ts
✅ recommend-skills.tool.ts
✅ package-json.parser.ts
❌ analyzer.ts (曖昧)
❌ recommend.ts (タイプ不明)
```

### 4. インポートルール

**原則: 直接個別ファイルからインポート**

**例外（index.ts 使用可能）:**
- `types/index.ts` - 型定義の公開API
- `tools/handlers/index.ts` - MCPツールの公開API

```typescript
// ✅ 許可: 公開APIからのインポート
import { Recommendation } from "../../types/index.js";
import { recommendSkills } from "../../tools/handlers/index.js";

// ✅ 推奨: 直接個別ファイルから
import { analyzeProject } from "../../services/analyzer/project-analyzer.service.js";

// ❌ 禁止: services/, config/, utils/ などに index.ts を作成
import { analyzeProject } from "../../services/analyzer/index.js";
```

**理由:**
- インポート元が明確
- 循環依存の防止
- 未使用コードの検出が容易

### 5. 単一責任の原則（SRP）

**各ファイルは1つの責務のみ:**
- パーサーは1つの言語/ファイル形式のみを扱う
- サービスは1つの機能領域のみを扱う
- ツールは1つのMCP操作のみを扱う

**ファイルが大きくなりすぎた場合:**
- サブディレクトリに分割
- 関連する機能をグルーピング

### 6. 型定義の管理

**型定義の配置:**
```
types/
├── index.ts              # 公開API
├── domain-types.ts       # ドメイン型
├── service-types.ts      # サービス型
└── raw-types.ts          # 外部データ型
```

**型定義のルール:**
- `type` を使用（`interface` は禁止）
- エクスポートする型は `index.ts` に追加
- 内部実装の型は各ファイルに定義

```typescript
// ✅ type を使用
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

### 7. 新機能追加のガイドライン

**新しいパーサーを追加する場合:**
```
1. src/services/analyzer/parsers/new-lang.parser.ts を作成
2. FRAMEWORK_MAPPINGS を定義
3. parse関数を実装
4. project-analyzer.service.ts に統合
5. file-mappings.ts にマッピング追加
6. tests/analyzer.test.ts にテスト追加
```

**新しいツールを追加する場合:**
```
1. schemas/tool-schemas.ts にスキーマ定義
2. tools/handlers/new-feature.tool.ts を作成
3. tools/handlers/index.ts にエクスポート追加
4. server/tool-registry.ts で registerTool() 呼び出し
5. tests/ にテスト追加
```

### 8. アーキテクチャチェックリスト

**新規コード追加時の確認:**

- [ ] 適切なディレクトリに配置されているか？
- [ ] ファイル命名規則に従っているか？
- [ ] 直接インポートを使用しているか？
  - [ ] index.ts は types/ と tools/handlers/ のみか？
- [ ] 型定義は適切なファイルに配置されているか？
- [ ] レイヤー間の依存方向は正しいか？
  - [ ] tools → services は OK
  - [ ] services → repositories は OK
  - [ ] services → tools は NG
  - [ ] repositories → services は NG
- [ ] 単一責任の原則を守っているか？
- [ ] ファイルサイズは適切か（大きすぎないか）？
- [ ] 循環依存はないか？

### 9. 禁止事項

❌ **絶対にやってはいけないこと:**

1. **不要な index.ts の作成**
   - services/, config/, utils/ に index.ts を作らない

2. **interface の使用**
   - すべて `type` を使用

3. **循環依存の作成**
   - レイヤー間の依存方向を守る

4. **グローバル変数の使用**
   - 必要な場合は明示的にパラメータで渡す

5. **巨大なファイルの作成**
   - ファイルが大きくなりすぎた場合は分割

### 10. アーキテクチャの参考資料

**プロジェクト内:**
- [CLAUDE.md](../../CLAUDE.md) - 開発ガイドライン
- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) - 詳細なアーキテクチャドキュメント

**原則:**
- Clean Architecture の概念を参考
- Domain-Driven Design の要素を取り入れ
- SOLID 原則に従う

### 11. リファクタリングの指標

**以下の場合はリファクタリングを検討:**
- ファイルが500行を超える
- 関数が50行を超える
- 循環的複雑度が高い
- 同じコードが3箇所以上に出現
- レイヤー間の依存が複雑
