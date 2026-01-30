# cc-recommender

[![npm version](https://img.shields.io/npm/v/cc-recommender.svg)](https://www.npmjs.com/package/cc-recommender)
[![CI](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml/badge.svg)](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yuji0809/cc-recommender/branch/main/graph/badge.svg)](https://codecov.io/gh/yuji0809/cc-recommender)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10.0.0-orange.svg)](https://pnpm.io/)

> 🎯 Skills, Plugins, and MCP Server Recommendation MCP Server for Claude Code

English | [日本語](./README.ja.md)

Just ask "What should I install?" in Claude Code, and it will analyze your project and recommend the best skills, plugins, and MCP servers.

## Features

- 📦 **Plugin Recommendations** - Suggests optimal plugins from the official marketplace
- 🔌 **MCP Server Recommendations** - Search MCP servers from awesome-mcp-servers
- 🎯 **Skill/Workflow Recommendations** - Suggests skills, hooks, and commands from awesome-claude-code
- 🔍 **Project Analysis** - Automatically detects languages, frameworks, and dependencies
- 🏷️ **Keyword Search** - Search by name or tags

## Installation

### Via npm (Recommended)

```bash
npm install -g cc-recommender
```

### Local Build

```bash
git clone https://github.com/yuji0809/cc-recommender.git
cd cc-recommender
pnpm install
pnpm run build
```

**Requirements:**
- Node.js >= 22.0.0
- pnpm >= 10.0.0

## Usage with Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "cc-recommender": {
      "command": "npx",
      "args": ["-y", "cc-recommender"]
    }
  }
}
```

Or for local build:

```json
{
  "mcpServers": {
    "cc-recommender": {
      "command": "node",
      "args": ["/path/to/cc-recommender/dist/index.js"]
    }
  }
}
```

## How to Use

### Project Analysis and Recommendations

```
You: What should I install for this project?

Claude: [Uses recommend_skills tool]

📦 Plugins
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. typescript-lsp (Official)
   ├─ Purpose: TypeScript definition jump, type checking
   ├─ Score: 95 ✅ High Match
   └─ Install: /plugin install typescript-lsp

🔌 MCP Servers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. supabase-mcp
   ├─ Purpose: Supabase DB operations
   ├─ Reason: Depends on @supabase/supabase-js
   └─ Install: claude mcp add supabase-mcp
```

### Keyword Search

```
You: Find MCP servers related to databases

Claude: [Uses search_skills tool]
```

## Available Tools

| Tool | Description |
|------|-------------|
| `recommend_skills` | Analyzes project and recommends appropriate skills/plugins/MCPs |
| `search_skills` | Search by keywords |
| `get_skill_details` | Get details of a specific item |
| `list_categories` | Get list of categories |
| `get_stats` | Get database statistics |

## Data Sources

| Source | Content |
|--------|---------|
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | Official plugin marketplace |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | Curated list of MCP servers |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | List of skills/workflows/hooks |

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Setup Husky (first time only)
pnpm run prepare
```

### Code Quality

This project uses **Biome** for code quality management.

```bash
# Lint + Format check
pnpm run lint

# Auto-fix
pnpm run lint:fix

# Format only
pnpm run format

# Type check
pnpm run typecheck

# Security audit
pnpm run audit

# All checks
pnpm run check
```

### Git Hooks (Husky)

The following runs automatically on commit:

1. **lint-staged** - Checks & formats only changed files with Biome
2. **Type check** - Verifies TypeScript type errors

If commit fails, fix the errors and commit again:

```bash
# After fixing errors
pnpm run lint:fix
git add .
git commit -m "fix: ..."
```

### Update Database

```bash
pnpm run fetch-data
```

### Testing

```bash
# Run tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:coverage
```

### Build

```bash
pnpm run build
```

## Project Structure

```
cc-recommender/
├── src/
│   ├── config/                      # Configuration
│   │   ├── constants.ts
│   │   ├── file-mappings.ts
│   │   └── scoring-config.ts
│   ├── repositories/                # Data access layer
│   │   └── recommendation.repository.ts
│   ├── utils/                       # Utilities
│   │   └── glob-matcher.ts
│   ├── types/                       # Type definitions
│   │   ├── index.ts                # Public API
│   │   ├── domain-types.ts
│   │   ├── service-types.ts
│   │   └── raw-types.ts
│   ├── schemas/                     # Zod validation schemas
│   │   └── tool-schemas.ts
│   ├── services/                    # Business logic
│   │   ├── analyzer/               # Project analysis
│   │   │   ├── parsers/
│   │   │   └── project-analyzer.service.ts
│   │   ├── recommender/            # Recommendation logic
│   │   │   ├── scoring/
│   │   │   ├── recommendation.service.ts
│   │   │   ├── search.service.ts
│   │   │   └── formatters.ts
│   │   ├── plugin-fetcher.ts
│   │   ├── mcp-fetcher.ts
│   │   └── skill-fetcher.ts
│   ├── tools/                       # MCP tools
│   │   └── handlers/
│   │       ├── index.ts            # Public API
│   │       ├── recommend-skills.tool.ts
│   │       ├── search-skills.tool.ts
│   │       ├── get-skill-details.tool.ts
│   │       ├── list-categories.tool.ts
│   │       └── get-stats.tool.ts
│   ├── server/                      # Server setup
│   │   ├── mcp-server.ts
│   │   └── tool-registry.ts
│   └── index.ts                     # Entry point
├── data/
│   └── recommendations.json         # Unified database
├── scripts/
│   └── fetch-data.ts                # Data fetch script
├── tests/
│   ├── analyzer.test.ts             # Analyzer tests
│   └── recommender.test.ts          # Recommender tests
├── docs/
│   └── ARCHITECTURE.md              # Architecture details
├── CLAUDE.md                        # Development guidelines
├── CONTRIBUTING.md                  # Contribution guide
└── README.md
```

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture documentation.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

For detailed architecture information, see [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## License

MIT

## Author

Yuji
