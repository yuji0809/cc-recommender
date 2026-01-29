# cc-recommender プロジェクト概要

## プロジェクトの目的

Claude Code向けのスキル・プラグイン・MCPサーバーを推薦するMCPサーバー。

### 解決する課題

Claude Codeユーザーが直面する以下の問題を解決：
- スキル/プラグイン/MCPサーバーが散在していて「どれを入れればいいかわからない」
- 情報が分散している（公式マーケット、awesome-*、個人リポジトリなど）
- どれが自分のプロジェクトに合うか判断しにくい
- セキュリティ面の不安もある

### 提供する価値

Claude Code内で「このプロジェクトに何入れたらいい？」と聞くだけで、**プロジェクト分析に基づき最適な推薦を提案**する。

## 3種類の推薦対象

1. **プラグイン** - LSP（言語支援）、開発ツール、セキュリティ、外部サービス連携
   - インストール: `/plugin install X`

2. **MCPサーバー** - DB連携、API連携、ブラウザ操作、クラウドサービス
   - インストール: `claude mcp add X`

3. **スキル/ワークフロー** - コーディングスキル、エージェント、スラッシュコマンド、フック
   - インストール: git clone / 手動コピー

## データソース

| ソース | 内容 | フォーマット |
|--------|------|-------------|
| `anthropics/claude-plugins-official` | 公式プラグイン | marketplace.json |
| `punkpeye/awesome-mcp-servers` | MCPサーバー500+ | Markdown（正規表現パース） |
| `hesreallyhim/awesome-claude-code` | スキル/ワークフロー100+ | CSV |

## 推薦ロジック

重み付きスコア計算：
- 言語マッチ × 5（例: TypeScript使用 → typescript-lsp推薦）
- フレームワーク × 4（例: Next.js使用 → vercel-mcp推薦）
- 依存関係 × 3（例: @prisma/client → prisma-mcp推薦）
- ファイル構造 × 2（例: vercel.json → vercel-mcp推薦）
- キーワード × 1（ユーザーの質問に含まれる単語）

補正：
- 公式なら × 1.3
- セキュリティ高 × 1.1

## ロードマップ

- Phase 1 ✅ MVP完成（今ここ）
- Phase 2: cc-audit連携（セキュリティスコア表示）
- Phase 3: GitHub Actions（日次データ更新）
- Phase 4: npm公開
