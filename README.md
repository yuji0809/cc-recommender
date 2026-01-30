# cc-recommender

[![npm version](https://img.shields.io/npm/v/cc-recommender.svg)](https://www.npmjs.com/package/cc-recommender)
[![npm downloads](https://img.shields.io/npm/dm/cc-recommender.svg)](https://www.npmjs.com/package/cc-recommender)
[![CI](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml/badge.svg)](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yuji0809/cc-recommender/branch/main/graph/badge.svg)](https://codecov.io/gh/yuji0809/cc-recommender)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

> 🎯 Skills, Plugins, and MCP Server Recommendation MCP Server for Claude Code

English | [日本語](./README.ja.md)

Just ask "What should I install?" in Claude Code, and it will analyze your project and recommend the best skills, plugins, and MCP servers.

## Features

- 📦 **Plugin Recommendations** - Suggests optimal plugins from the official marketplace
- 🔌 **MCP Server Recommendations** - Search MCP servers from awesome-mcp-servers
- 🎯 **Skill/Workflow Recommendations** - Suggests skills, hooks, and commands from awesome-claude-code
- 🔍 **Project Analysis** - Automatically detects languages, frameworks, and dependencies
- 🏷️ **Keyword Search** - Search by name or tags
- 🔄 **Auto-Update** - Always fetches the latest data from GitHub (no manual updates needed)

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
- pnpm >= 10.0.0 (for local build)

## Usage with Claude Code

### Option 1: Using npx (Recommended)

No installation required. Always uses the latest version.

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

### Option 2: Global Installation

Faster startup, works offline. Requires manual updates.

```bash
npm install -g cc-recommender
```

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "cc-recommender": {
      "command": "cc-recommender"
    }
  }
}
```

### Option 3: Local Build (For Development)

```bash
git clone https://github.com/yuji0809/cc-recommender.git
cd cc-recommender
pnpm install
pnpm run build
```

Add to `~/.claude/settings.json`:

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

This MCP server aggregates data from the following sources:

| Source | Content | Update Frequency |
|--------|---------|------------------|
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | Official plugin marketplace | Weekly |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | Curated list of MCP servers | Weekly |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | List of skills/workflows/hooks | Weekly |

### Auto-Update Feature

**How it works:**
- The server automatically fetches the latest data from GitHub when it starts
- Falls back to bundled data if the remote fetch fails
- No manual updates or reinstallation required

**Offline Mode** (optional):
```json
{
  "mcpServers": {
    "cc-recommender": {
      "command": "npx",
      "args": ["-y", "cc-recommender"],
      "env": {
        "CC_RECOMMENDER_OFFLINE_MODE": "true"
      }
    }
  }
}
```

When `CC_RECOMMENDER_OFFLINE_MODE` is enabled, only bundled data is used (no remote fetching).

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CC_RECOMMENDER_OFFLINE_MODE` | Disable auto-updates and use only bundled data | `false` |
| `SKIP_SECURITY_SCAN` | Skip security scanning during data fetch (for developers) | `false` |

## Development

For development setup and contribution guidelines, see:
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guide
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Architecture documentation

### Quick Start for Developers

```bash
# Install dependencies
pnpm install

# Run tests
pnpm run test

# Type check + Lint + Security audit
pnpm run check

# Build
pnpm run build
```

## Security

Security is a top priority for this project. We employ multiple layers of automated security measures:

- **Automated Scanning**: Dependabot, CodeQL, and custom security audits
- **Pre-commit Protection**: Security checks run before every commit
- **CI/CD Gates**: All PRs must pass security scans before merging
- **License Compliance**: All dependencies are validated for approved licenses

For more details, see [SECURITY.md](./SECURITY.md).

To report a security vulnerability, please use [GitHub Security Advisories](https://github.com/yuji0809/cc-recommender/security/advisories).

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

[MIT](https://opensource.org/licenses/MIT)

## Author

Yuji
