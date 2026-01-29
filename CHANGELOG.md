# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Code quality tools:
  - Biome for linting and formatting
  - TypeScript strict mode
  - Husky + lint-staged for pre-commit hooks
- Developer experience:
  - pnpm package manager
  - Automatic data fetching script
  - Comprehensive documentation

## [0.1.0] - 2026-01-30

### Added
- Initial project setup
- Basic MCP server implementation
- TypeScript configuration
- Build and development scripts

[Unreleased]: https://github.com/fujinamiyuji/cc-recommender/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/fujinamiyuji/cc-recommender/releases/tag/v0.1.0
