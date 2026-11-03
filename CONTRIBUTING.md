# Contributing to cc-recommender

Thanks for taking the time to contribute. This file covers setup, the checks a change has to pass, and how releases work. The coding rules are in [CLAUDE.md](./CLAUDE.md), and the design is described in [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

Please report security problems privately as described in [SECURITY.md](./SECURITY.md), not in a public issue. This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Setup

You need Node.js 22 or later and pnpm 10. The pnpm version is pinned in `package.json` (`"packageManager": "pnpm@10.12.3"`), so running `corepack enable` once gives you the right version.

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/<your-username>/cc-recommender.git
cd cc-recommender
pnpm install
git checkout -b fix/short-description
```

`pnpm install` also installs the Husky git hooks through the `prepare` script.

## Checks

| Command | What it runs |
|---|---|
| `pnpm run typecheck` | `tsc --noEmit` in strict mode |
| `pnpm run lint` | Biome lint and format check (`pnpm run lint:fix` applies fixes) |
| `pnpm run audit` | cc-audit security scan |
| `pnpm run license:check` | Fails if a dependency's license is outside the allowlist |
| `pnpm run test` | Vitest (`pnpm run test:coverage` adds a coverage report) |
| `pnpm run build` | `tsc`, output in `dist/` |
| `pnpm run check` | typecheck, lint, audit, and license:check |

`pnpm run check` does not run the tests or the build. Before opening a pull request, run all three:

```bash
pnpm run check
pnpm run test
pnpm run build
```

Unused variables and imports are caught by Biome (`noUnusedVariables` and `noUnusedImports` are errors), not by `tsc`.

### Pre-commit hook

`.husky/pre-commit` runs on every commit:

1. `lint-staged`, which runs `biome check --write` on staged `*.js`, `*.ts`, and `*.json` files.
2. `pnpm run typecheck`.
3. A grep for strings that look like secrets in staged files outside `data/`. This only prints a warning.
4. `pnpm run audit`. The commit is aborted if cc-audit fails.

The hook does not run the tests.

### CI

Every pull request to `main` runs these checks:

- `Code Quality` (`ci.yml`, Node 24): typecheck, lint, cc-audit, `pnpm audit --audit-level=moderate`, license check, tests with coverage, Codecov upload, and build. The Codecov upload is set to `fail_ci_if_error: false` and there is no coverage threshold.
- `Build on Node 22` and `Build on Node 24` (`ci.yml`): install and build only, then confirm `dist/index.js` exists. Tests run only on Node 24.
- `Verify actions.lock` (`verify-lockfile.yml`): `gh actions-lock --verify`.
- `Analyze (javascript)` (`codeql.yml`): CodeQL with the `security-and-quality` queries.

`pnpm audit` is not part of `pnpm run check`. If you change dependencies, run `pnpm audit --audit-level=moderate` locally as well.

### GitHub Actions lockfile

The actions used in `.github/workflows/` are pinned to commit SHAs in `.github/workflows/actions.lock`. If you add or change a `uses:` line, regenerate the lockfile and commit it together with the workflow change:

```bash
gh extension install github/gh-actions-lock --pin v0.4.1  # first time only
gh actions-lock
gh actions-lock --verify
```

This also applies to Dependabot PRs that bump an action. If `Verify actions.lock` fails on one, run `gh actions-lock` on that branch.

## Code rules

The full rules are in [CLAUDE.md](./CLAUDE.md). These are the ones that come up most in review:

- Layers depend downward only: `tools` → `services` → `repositories`. `config`, `utils`, and `types` can be used from any layer.
- Import from the file that defines the symbol. `index.ts` exists only in `src/types/` and `src/tools/handlers/`; don't add new ones.
- Relative imports use the `.js` extension (`moduleResolution` is `NodeNext`).
- Use `type`, not `interface`.
- File names are kebab-case with a type suffix, for example `project-analyzer.service.ts`, `package-json.parser.ts`, `recommend-skills.tool.ts`.
- Write new features test-first. See [docs/TDD.md](./docs/TDD.md).

## Tests

Tests use Vitest and live under `tests/`. Newer tests mirror the path in `src/` (`src/utils/github-url.ts` is tested in `tests/utils/github-url.test.ts`). Older tests are grouped under `tests/analyzer/`, `tests/fetchers/`, and `tests/recommender/`. Tests don't make network calls: the fetcher and repository tests stub `fetch` or mock the GitHub API module.

```bash
pnpm run test                                  # all tests
pnpm run test tests/utils/github-url.test.ts   # one file
pnpm run test:watch
pnpm run test:coverage                         # writes coverage/ (text, json, html)
```

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). release-please reads the commit messages on `main` to decide the next version, so the type matters. If a PR is squash-merged, its title becomes the commit message, so give the PR a Conventional Commits title as well.

```
fix(analyzer): handle missing package.json
feat(recommender): add support for custom scoring weights
docs: update contributing guide
```

| Type | Release | Example from 0.9.1 |
|---|---|---|
| `fix:` | patch | 0.9.2 |
| `feat:` | minor | 0.10.0 |
| `feat!:`, `fix!:`, or a `BREAKING CHANGE:` footer | major | 1.0.0 |
| `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `style:` | none | |

Dependabot commits use `chore(deps)` and `chore(deps-dev)` for npm and `ci(deps)` for GitHub Actions, so they don't trigger a release on their own.

## Pull requests

1. Branch from `main` and keep each PR to one change.
2. Run `pnpm run check`, `pnpm run test`, and `pnpm run build`.
3. Fill in the PR template and link the issue it addresses.
4. Don't edit `CHANGELOG.md` or the version in `package.json`. release-please updates both.

`main` requires one approving review, and the branch has to be up to date with `main` before it can be merged. The full settings are in [.github/BRANCH_PROTECTION.md](./.github/BRANCH_PROTECTION.md).

## Recommendation data

The data is in `data/plugins.json`, `data/mcp-servers.json`, and `data/skills.json`. The `update-data.yml` workflow rebuilds it every day at 09:00 JST (00:00 UTC) and, if anything changed, opens a PR from the `update-recommendations-data` branch. The maintainer reviews and merges that PR.

To rebuild the data locally:

```bash
pnpm run fetch-data          # all types; scans unless SKIP_SECURITY_SCAN=true
pnpm run fetch-data:full     # all types, always with the cc-audit scan
pnpm run fetch-data:quick    # all types, no scan
pnpm run fetch-data:skills   # one type only (also fetch-data:plugins and fetch-data:mcp)
```

Without a token the GitHub API allows 60 requests per hour, and 5,000 with one. Pass a personal access token (see `.env.example`):

```bash
GITHUB_TOKEN=<your-token> pnpm run fetch-data
```

To add a skill source, add an entry to `src/config/direct-skill-sources.ts` (repositories that contain skills) or `src/config/curated-list-sources.ts` (README lists that link to skill repositories). A new kind of source needs a fetcher under `src/services/fetchers/` and a call from `scripts/fetch-data.ts`. See [docs/DATA_MANAGEMENT.md](./docs/DATA_MANAGEMENT.md) for details.

## Releases

Releases are automated. Contributors only need to write proper commit messages.

1. When `fix` or `feat` commits land on `main`, release-please opens or updates a release PR titled `chore(main): release X.Y.Z` with the version bump and the `CHANGELOG.md` entry.
2. When the maintainer merges the release PR, release-please creates the tag and the GitHub release. The `publish` job in `release-please.yml` then runs `pnpm run check`, `pnpm run test`, and `pnpm run build`.
3. The job runs `npm stage publish`, authenticated through npm trusted publishing (OIDC) rather than a token. This stages the package; it is not public yet.
4. The maintainer approves the staged release with 2FA. `npm stage` needs npm 11 or later.

```bash
npm stage list cc-recommender
npm stage approve <stage-id>
```

The manual `publish.yml` workflow still uses the `NPM_TOKEN` secret, which expired on 2026-04-30, and the npm trusted publisher is configured only for `release-please.yml`. That workflow does not work at the moment.

## Questions

Use [GitHub Issues](https://github.com/yuji0809/cc-recommender/issues) for bug reports, feature requests, and questions.

## License

By contributing, you agree that your contributions are released under the [MIT License](./LICENSE).
