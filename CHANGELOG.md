# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0](https://github.com/yuji0809/cc-recommender/compare/v0.4.1...v0.5.0) (2026-01-31)


### Features

* add support for multiple new project file parsers ([93cb69f](https://github.com/yuji0809/cc-recommender/commit/93cb69f34c5c64763afcbf873c37645f34c2e8fc))

## [0.4.1](https://github.com/yuji0809/cc-recommender/compare/v0.4.0...v0.4.1) (2026-01-30)


### Bug Fixes

* reorganize services and update fetcher structure ([1a00357](https://github.com/yuji0809/cc-recommender/commit/1a0035791606aead2482d9acba68a8bc7f4a2243))

## [0.4.0](https://github.com/yuji0809/cc-recommender/compare/v0.3.0...v0.4.0) (2026-01-30)


### Features

* implement dual-source fetching for MCP servers and plugins ([b4b80a8](https://github.com/yuji0809/cc-recommender/commit/b4b80a8972b07fdedb2f311e19f6139df025da06))

## [0.3.0](https://github.com/yuji0809/cc-recommender/compare/v0.2.2...v0.3.0) (2026-01-30)


### Features

* enhance scoring system and add bonus recommendations ([16646df](https://github.com/yuji0809/cc-recommender/commit/16646df64860d939a6302e33193678ee603d375c))

## [0.2.2](https://github.com/yuji0809/cc-recommender/compare/v0.2.1...v0.2.2) (2026-01-30)


### Bug Fixes

* integrate npm publish into release-please workflow ([4bfdd0f](https://github.com/yuji0809/cc-recommender/commit/4bfdd0f50b670eed67d9b1bc748a49acee82e1e4))

## [0.2.1](https://github.com/yuji0809/cc-recommender/compare/v0.2.0...v0.2.1) (2026-01-30)


### Bug Fixes

* add debug logging and improve error handling ([754dcfc](https://github.com/yuji0809/cc-recommender/commit/754dcfc14343b57355767bc64c40639f9aa6b69b))

## [0.2.0](https://github.com/yuji0809/cc-recommender/compare/v0.1.1...v0.2.0) (2026-01-30)


### Features

* add release-please for automated releases ([7ce1c22](https://github.com/yuji0809/cc-recommender/commit/7ce1c2285154d93c501f3f61bc0e48f9183eaf12))


### Bug Fixes

* remove deprecated package-name parameter from release-please ([c043385](https://github.com/yuji0809/cc-recommender/commit/c043385338885da915c956904af59eb382e5f99d))

## [Unreleased]

## [0.1.0] - 2025-01-30

### Added
- Initial release of cc-recommender
- MCP server for recommending Claude Code skills, plugins, and MCP servers
- Project analysis based on languages, frameworks, and dependencies
- 5 MCP tools:
  - `recommend_skills` - Analyze project and recommend suitable items
  - `search_skills` - Search by keyword
  - `get_skill_details` - Get detailed information
  - `list_categories` - List all categories
  - `get_stats` - Get database statistics
- Data sources:
  - [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) - Official plugins
  - [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) - MCP servers
  - [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) - Skills/workflows/hooks
- Auto-update feature:
  - Fetches latest data from GitHub on startup
  - Falls back to bundled data if remote fetch fails
  - No manual updates required
- Code quality tools:
  - Biome for linting and formatting
  - TypeScript strict mode
  - cc-audit for security scanning
  - Husky + lint-staged for pre-commit hooks
- Developer experience:
  - pnpm package manager
  - Automatic weekly data updates via GitHub Actions
  - Comprehensive documentation (README, CONTRIBUTING, ARCHITECTURE)

[Unreleased]: https://github.com/yuji0809/cc-recommender/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yuji0809/cc-recommender/releases/tag/v0.1.0
