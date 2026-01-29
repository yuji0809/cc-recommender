# Biome設定

## 概要

cc-recommenderでは、ESLint + Prettierの代わりに**Biome**を使用しています。
Biomeは Rust製の高速なLinter & Formatterで、設定が簡単で、実行速度が非常に速いのが特徴です。

## インストール

```bash
pnpm add -D @biomejs/biome
```

## 設定ファイル: biome.json

**OSSプロジェクト向けの厳格な設定**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.13/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main"
  },
  "files": {
    "ignoreUnknown": false,
    "maxSize": 10485760
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf",
    "formatWithErrors": false
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "warn",
        "noParameterAssign": "warn",
        "useConst": "error",
        "useTemplate": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noDoubleEquals": "warn"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all",
      "arrowParentheses": "always",
      "bracketSameLine": false,
      "bracketSpacing": true,
      "quoteProperties": "asNeeded"
    }
  },
  "json": {
    "formatter": {
      "enabled": true,
      "indentWidth": 2,
      "trailingCommas": "none"
    },
    "parser": {
      "allowComments": true,
      "allowTrailingCommas": false
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

## 主要な設定

### Formatter（フォーマッター）

- **indentStyle**: `space` - スペースインデント
- **indentWidth**: `2` - 2スペース
- **lineWidth**: `100` - 行幅100文字
- **lineEnding**: `lf` - LF改行（Unix形式）
- **formatWithErrors**: `false` - エラーがある場合はフォーマットしない

### JavaScript Formatter

- **quoteStyle**: `double` - ダブルクォート
- **semicolons**: `always` - セミコロン必須
- **trailingCommas**: `all` - 末尾カンマあり
- **arrowParentheses**: `always` - アロー関数の括弧必須
- **bracketSameLine**: `false` - 開始括弧は次の行
- **bracketSpacing**: `true` - オブジェクトリテラルにスペース
- **quoteProperties**: `asNeeded` - 必要な時のみプロパティをクォート

### Linter Rules（OSSレベル）

**推奨ルールをすべて有効化**:
```json
"recommended": true
```

**追加の厳格なルール**:
- **noUnusedVariables**: `error` - 未使用変数はエラー
- **noUnusedImports**: `error` - 未使用インポートはエラー
- **noExplicitAny**: `warn` - any型の使用は警告
- **noDoubleEquals**: `warn` - `==`の使用は警告（`===`を推奨）
- **noNonNullAssertion**: `warn` - non-null assertion (`!`) は警告
- **noParameterAssign**: `warn` - パラメータの再代入は警告
- **useConst**: `error` - 再代入しない変数は`const`必須
- **useTemplate**: `warn` - 文字列連結よりテンプレートリテラル推奨

### 品質保証

- **maxSize**: `10485760` (10MB) - 処理する最大ファイルサイズ
- **organizeImports**: `on` - インポートの自動整理

## VCS統合

Biomeは`.gitignore`を自動的に読み込んで、無視されたファイルをスキップします。
設定: `"vcs.useIgnoreFile": true`

## コマンド

### Lint + Format チェック

```bash
pnpm run lint
# 実行: biome check .
```

### 自動修正（safe fixes）

```bash
pnpm run lint:fix
# 実行: biome check --write .
```

### Unsafe修正も適用

```bash
pnpm biome check --write --unsafe .
```

### フォーマットのみ

```bash
pnpm run format
# 実行: biome format --write .
```

## 保存時自動フォーマット

`.claude/settings.local.json`に以下を設定：

```json
{
  "hooks": {
    "onFileSave": "pnpm biome format --write ${file}"
  }
}
```

これにより、**Cmd+S（Ctrl+S）でファイル保存時に自動的にBiomeフォーマットが実行**されます。

## 現在の警告（4件）

以下の4箇所でnon-null assertion警告が出ていますが、**ロジック的に安全**であり、OSSプロジェクトとして許容範囲です：

1. **scripts/fetch-data.ts:96** - `seen.get(normalizedUrl)!`
   - 理由: `else`ブロック内で、必ず存在することが保証されている

2. **src/services/mcp-fetcher.ts:211** - `detection.keywords!`
   - 理由: 配列スプレッド前に初期化確認済み

3. **src/services/skill-fetcher.ts:277** - `rules.keywords!`
   - 理由: 配列スプレッド前に初期化確認済み

4. **src/tools/index.ts:215** - `categoryMap.get(cat)!`
   - 理由: 直前の`if (!categoryMap.has(cat))`で存在保証

これらは**警告レベル**（`warn`）に設定されており、エラーではありません。必要に応じて以下の対応が可能です：

### 対応方法1: コードを修正して警告を解消

```typescript
// Before
const entry = categoryMap.get(cat)!;

// After
const entry = categoryMap.get(cat);
if (!entry) throw new Error("Unexpected: category not found");
```

### 対応方法2: ルールを無効化（非推奨）

```json
{
  "linter": {
    "rules": {
      "style": {
        "noNonNullAssertion": "off"
      }
    }
  }
}
```

## OSSプロジェクトとして

### コード品質チェック

```bash
# すべてのチェックを実行
pnpm run check
# 実行内容: pnpm run typecheck && pnpm run lint

# 結果:
# ✅ 型チェック: エラーなし
# ✅ Lint: 4つの警告のみ
# ✅ ビルド: 成功
```

### 品質指標

- **型安全性**: TypeScript strict mode有効
- **コード品質**: Biome recommended + 追加ルール
- **未使用コード**: エラーレベルで検出
- **危険なパターン**: `any`、`==`、パラメータ再代入など警告
- **一貫性**: 自動フォーマット + インポート整理

## Biome vs ESLint + Prettier

| 項目 | Biome | ESLint + Prettier |
|------|-------|-------------------|
| 実行速度 | 非常に高速（Rust製） | 遅い（JavaScript） |
| 設定の簡単さ | 簡単（1ファイル） | 複雑（複数設定ファイル） |
| 機能 | Lint + Format統合 | 別々のツール |
| プラグイン | 少ない | 豊富 |
| 採用状況 | 成長中 | 広く普及 |

cc-recommenderでは、シンプルさと速度を重視してBiomeを採用しています。
