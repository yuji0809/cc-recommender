# ブランチ保護の設定

`main` のブランチ保護は Terraform（`.github/terraform/main.tf`）で管理しています。このファイルは設定内容と既知の問題をまとめたリファレンスです。変更の手順だけ知りたい場合は [BRANCH_PROTECTION_QUICKSTART.md](./BRANCH_PROTECTION_QUICKSTART.md) を見てください。

## 現在の設定

2026-11-03 に `gh api repos/yuji0809/cc-recommender/branches/main/protection` で取得した値です。`main.tf` の内容と一致しています。

| 項目 | 値 | `main.tf` |
|---|---|---|
| PR の承認 | 1 件必須 | `required_approving_review_count = 1` |
| push で古い承認を取り消す | する | `dismiss_stale_reviews = true` |
| コードオーナーのレビュー | 不要 | `require_code_owner_reviews = false` |
| ステータスチェック | 必須。ブランチが `main` に追従していること | `strict = true` |
| 必須チェック | `Code Quality / Type check`、`Code Quality / Lint`、`Code Quality / Security Audit`、`Code Quality / Test with Coverage` | `contexts`（次の節を参照） |
| 会話の解決 | 必須 | `require_conversation_resolution = true` |
| 管理者への適用 | しない | `enforce_admins = false` |
| 線形履歴 | 不要 | `required_linear_history = false` |
| force push | 禁止 | `allows_force_pushes = false` |
| ブランチの削除 | 禁止 | `allows_deletions = false` |

## 既知の問題: 必須チェックの名前が実際のチェックと合っていない

`contexts` に書いている `Code Quality / Lint` などのチェックは、どの PR でも報告されません。GitHub Actions のチェック名はジョブの `name:`（マトリクスのジョブは値が入った名前）で、ステップ名がチェックになることはないためです。`<A> / <B>` の形になるのは reusable workflow を呼び出すジョブだけです。

PR で実際に報告されるチェックは次のとおりです（PR #48 で確認）。

| チェック名 | ワークフロー | 内容 |
|---|---|---|
| `Code Quality` | `ci.yml` | 型チェック、Lint、cc-audit、`pnpm audit`、ライセンス、テストとカバレッジ、ビルド（Node 24） |
| `Build on Node 22` | `ci.yml` | インストールとビルドのみ |
| `Build on Node 24` | `ci.yml` | インストールとビルドのみ |
| `Verify actions.lock` | `verify-lockfile.yml` | `gh actions-lock --verify` |
| `Analyze (javascript)` | `codeql.yml` | CodeQL |

ほかに code scanning が付ける `CodeQL` チェックと、Codecov アプリが付ける `codecov/patch` ステータスも表示されますが、どちらもワークフローのジョブではありません。

必須チェックが報告されないので、PR は "Expected — Waiting for status to be reported" のままになり、通常の手順ではマージできません。現在は `enforce_admins = false` を利用して、管理者がバイパスしてマージしています。

直すには、`main.tf` の `contexts` を実際のチェック名に置き換えて `terraform apply` します。どれを必須にするかはメンテナーが決めますが、たとえば次のようになります。

```hcl
  required_status_checks {
    strict = true
    contexts = [
      "Code Quality",
      "Build on Node 22",
      "Build on Node 24",
      "Verify actions.lock",
      "Analyze (javascript)",
    ]
  }
```

ワークフローのジョブ名を変えたときは、`contexts` も同時に変える必要があります。

`contexts` を直しても、次の PR は引き続き管理者のバイパスが必要です。

- メンテナー自身の PR。PR の作成者は自分の PR を承認できないので、承認 1 件の条件を満たせません。PR #48 と #50 はどちらもレビューなしでマージしています。
- release-please のリリース PR と `update-data.yml` のデータ更新 PR。どちらも `GITHUB_TOKEN` で作られるため CI が起動せず、チェックが 1 つも付きません（PR #49、#38）。

## Terraform の運用

### 必要なもの

- Terraform（`brew install terraform`）。provider は `integrations/github` の `~> 6.0` です。
- リポジトリの管理者権限があるトークンを `GITHUB_TOKEN` に設定します。classic の Personal Access Token なら `repo` スコープ、fine-grained token なら Administration の Read and write 権限が必要です。`gh` でログインしているなら `export GITHUB_TOKEN=$(gh auth token)` でも構いません。

### state

state はローカルの `.github/terraform/terraform.tfstate` にあり、`.github/terraform/.gitignore` で除外しているので Git には入っていません。state がない環境（新しく clone した場合など）で `terraform apply` すると、既存のルールを新しく作成しようとします。先に既存の設定を import してください。

```bash
cd .github/terraform
terraform init
terraform import github_branch_protection.main cc-recommender:main
terraform plan   # No changes になることを確認
```

GitHub の設定画面で直接変更すると `main.tf` とずれます。`main.tf` を変更していない状態で `terraform plan` を実行し、差分が出ればずれています。

## トラブルシューティング

- `403` や `Resource not accessible by personal access token` が出る: トークンにリポジトリの管理者権限がありません。上の「必要なもの」の権限を確認してください。
- 必須チェックが "Expected — Waiting for status to be reported" のまま: `contexts` の名前が実際のチェック名と違います。`gh pr checks <PR 番号>` か PR の Checks タブで実際の名前を確認してください。

## 参考

- [About protected branches (GitHub Docs)](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [github_branch_protection (Terraform GitHub provider)](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection)
