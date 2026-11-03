# ブランチ保護の変更手順

`main` のブランチ保護を変更するときの手順です。現在の設定、既知の問題（必須チェック名の不一致）、トークンの権限、state の扱いは [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) にまとめています。

## 準備（初回のみ）

```bash
brew install terraform

# リポジトリの管理者権限があるトークン。gh でログイン済みならこれで足ります
export GITHUB_TOKEN=$(gh auth token)

cd .github/terraform
terraform init
```

state ファイル（`terraform.tfstate`）は Git に入っていません。手元に state がない場合は、先に import します。

```bash
terraform import github_branch_protection.main cc-recommender:main
```

## 変更する

1. ブランチを作り、`.github/terraform/main.tf` を編集します。
2. 差分を確認して適用します。

   ```bash
   cd .github/terraform
   terraform plan
   terraform apply
   ```

3. `main.tf` の変更をコミットし、PR を作ります。管理者は `main` に直接 push できてしまいますが、変更は PR を通してください。

   ```bash
   git add .github/terraform/main.tf
   git commit -m "chore: update branch protection rules"
   ```

設定を変えたら [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) の「現在の設定」も更新してください。

## よくある変更

必須チェックは `required_status_checks` の `contexts` に、ジョブ名と同じ名前で書きます（例: `Code Quality`、`Build on Node 22`）。実際の名前は `gh pr checks <PR 番号>` で確認できます。今の `contexts` を直すときの候補は [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) の「既知の問題」にあります。

承認の数は、既存の `required_pull_request_reviews` ブロックの中の値だけを変えます。ブロックごと書き換えると `dismiss_stale_reviews` などの設定が消えます。

```hcl
    required_approving_review_count = 2
```

`enforce_admins = true` にすると管理者もルールに従うことになり、バイパスができなくなります。今の構成でこれを有効にすると、メンテナー自身の PR（自分では承認できない）と、チェックが付かないリリース PR・データ更新 PR がマージできなくなります。詳しくは [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) の「既知の問題」を見てください。
