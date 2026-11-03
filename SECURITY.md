# Security Policy

## Supported versions

Only the latest release receives security fixes. Please upgrade to the newest version on npm before reporting.

| Version | Supported |
| ------- | --------- |
| 0.9.x   | Yes       |
| < 0.9   | No        |

## Reporting a vulnerability

Please do not open a public issue for security problems. Report them privately through GitHub instead:

1. Open the [Security tab](https://github.com/yuji0809/cc-recommender/security) of this repository.
2. Click **Report a vulnerability**.
3. Describe the problem, how to reproduce it, and its impact. A proof of concept helps if you have one.

This is a project maintained by one person. I will try to acknowledge reports within a week and will let you know when a fix is released.

## What is in place

Dependencies and code:

- Dependabot alerts and security updates, plus CodeQL analysis on pushes and pull requests to `main`.
- CI runs `pnpm audit --audit-level=moderate`, [cc-audit](https://www.npmjs.com/package/@cc-audit/cc-audit), and a license allowlist check.
- A pre-commit hook runs type checking, Biome, cc-audit, and a warning for strings that look like secrets.

Build and release:

- GitHub Actions dependencies are pinned to commit SHAs in `.github/workflows/actions.lock`, and the `Verify Actions Lockfile` workflow checks it on every pull request.
- npm releases use [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) instead of a long-lived token, and are published with provenance.
- Releases go through npm staged publishing: CI only stages the package, and it is published after the maintainer approves it with 2FA.

Recommendation data:

- At runtime, the remote data is checked before use (expected item types, at most 50,000 items and 50 MB per file, at most 100 KB per item). If the check fails, the server falls back to the data bundled with the package.
- The database rebuild runs cc-audit against the listed repositories, but the resulting scores are not yet reliable enough to be treated as a security filter.

## Using recommendations safely

cc-recommender points you to third-party plugins, MCP servers, and skills. A recommendation is not a security review. Read the source and the permissions a tool asks for before installing it, and prefer official or well-maintained projects.
