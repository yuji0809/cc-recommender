# Branch Protection as Code

このプロジェクトでは、ブランチプロテクション設定を **Terraform** で管理しています。

## 設定内容

### 保護対象ブランチ
- `main`

### ルール

1. **Pull Request必須**
   - mainブランチへの直接pushを禁止
   - 1人以上のレビュー承認が必要
   - 古いレビューは新しいpush時に自動却下

2. **ステータスチェック必須**
   - CI テストが全て通過必須
   - ブランチは最新状態である必要あり
   - 必須チェック:
     - Type check (TypeScript)
     - Lint (Biome)
     - Security Audit (cc-audit)
     - Tests (Vitest)

3. **会話解決必須**
   - PRコメントの全てが解決されている必要あり

4. **Force Push禁止**
   - 履歴改変を防止

5. **ブランチ削除禁止**
   - mainブランチの誤削除を防止

---

## Terraform による管理

### 前提条件

```bash
# Terraform インストール
brew install terraform

# GitHub Personal Access Token 設定
export GITHUB_TOKEN="your_token_here"
```

### 適用方法

```bash
cd .github/terraform

# 初期化
terraform init

# プラン確認
terraform plan

# 適用
terraform apply
```

### 設定変更

1. `.github/terraform/main.tf` を編集
2. `terraform apply` 実行

---

## 設定ファイル

`.github/terraform/main.tf`

```hcl
resource "github_branch_protection" "main" {
  repository_id = "cc-recommender"
  pattern       = "main"
  ...
}
```

---

## トラブルシューティング

### エラー: 403 Forbidden

**原因**: リポジトリの管理者権限がない

**解決策**:
- リポジトリオーナーとして実行
- `GITHUB_TOKEN` に適切な権限を付与

### Status checksが見つからない

**原因**: CI workflowが一度も実行されていない

**解決策**:
1. PRを作成してCIを実行
2. 実際のジョブ名を確認
3. `branch-protection.json` の `contexts` を更新

---

## CI/CD Integration（オプション）

Terraform Cloud/Enterprise を使用する場合、GitHub Actions でブランチプロテクションを自動更新できます:

```yaml
# .github/workflows/terraform-apply.yml
name: Terraform Apply

on:
  push:
    paths:
      - '.github/terraform/**'
    branches:
      - main

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - name: Terraform Apply
        working-directory: .github/terraform
        run: |
          terraform init
          terraform apply -auto-approve
        env:
          GITHUB_TOKEN: ${{ secrets.TERRAFORM_GITHUB_TOKEN }}
```

---

## ベストプラクティス

1. **Infrastructure as Code**
   - ✅ `.github/terraform/main.tf` をGit管理下に置く
   - ✅ Terraform state はローカルまたはリモートで管理
   - ✅ 変更履歴を残す

2. **変更手順**
   - `.github/terraform/main.tf` を編集
   - `terraform plan` で変更内容を確認
   - `terraform apply` で適用
   - PR作成してレビュー（推奨）

3. **ドキュメント更新**
   - 設定変更時はこのファイルも更新
   - 変更理由をコミットメッセージに記載

4. **定期確認**
   - 四半期ごとに設定を見直す
   - `terraform plan` で drift を検出

5. **State管理**
   - `.terraform/` と `*.tfstate` は `.gitignore` に追加済み
   - 本番環境では Terraform Cloud/S3 backend 推奨

---

## 参考資料

- [GitHub Branch Protection API](https://docs.github.com/en/rest/branches/branch-protection)
- [Terraform GitHub Provider](https://registry.terraform.io/providers/integrations/github/latest/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
