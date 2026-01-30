# Branch Protection クイックスタート

## 初回セットアップ（3ステップ）

```bash
# 1. Terraform インストール（初回のみ）
brew install terraform

# 2. GitHub Personal Access Token 設定（初回のみ）
export GITHUB_TOKEN="your_token_here"

# 3. ブランチプロテクション適用
cd .github/terraform
terraform init
terraform plan    # 確認
terraform apply   # 適用
```

## 設定変更

```bash
# 1. 設定ファイル編集
code .github/terraform/main.tf

# 2. 変更確認
cd .github/terraform
terraform plan

# 3. 適用
terraform apply

# 4. コミット
cd ../..
git add .github/terraform/main.tf
git commit -m "chore: update branch protection rules"
git push
```

## よくある設定変更例

### レビュー人数を変更

```hcl
required_pull_request_reviews {
  required_approving_review_count = 2  # 1 → 2
}
```

### ステータスチェックを追加

```hcl
required_status_checks {
  contexts = [
    "Code Quality / Type check",
    "Code Quality / Lint",
    "Code Quality / Security Audit",
    "Code Quality / Test with Coverage",
    "New Check Name",  # 追加
  ]
}
```

### 管理者も対象にする

```hcl
enforce_admins = true  # false → true
```

## トラブルシューティング

### terraform コマンドが見つからない
```bash
brew install terraform
```

### 認証エラー
```bash
export GITHUB_TOKEN="your_github_token"
# または
# ~/.bashrc / ~/.zshrc に追加
```

### 403 Forbidden
- リポジトリの管理者権限が必要
- Personal Access Token に `repo` スコープが必要
- オーナーとして実行してください

### Token の取得方法
1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" をクリック
3. `repo` スコープを選択
4. Token を生成してコピー
5. `export GITHUB_TOKEN="..."` で設定
