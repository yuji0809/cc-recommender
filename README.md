# cc-recommender

[![npm version](https://img.shields.io/npm/v/cc-recommender.svg)](https://www.npmjs.com/package/cc-recommender)
[![npm downloads](https://img.shields.io/npm/dt/cc-recommender.svg)](https://www.npmjs.com/package/cc-recommender)
[![CI](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml/badge.svg)](https://github.com/yuji0809/cc-recommender/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/yuji0809/cc-recommender/branch/main/graph/badge.svg)](https://codecov.io/gh/yuji0809/cc-recommender)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)

English | [日本語](./README.ja.md)

An MCP server that suggests Claude Code plugins, MCP servers, and skills for the project you are working on.

Ask Claude Code something like "What should I install for this project?". cc-recommender reads the project's manifest files, works out the languages, frameworks, and dependencies in use, and returns matching entries from a database of about 19,000 plugins, MCP servers, and skills (as of November 2026).

## Setup

Requires Node.js 22 or later.

### Claude Code

```bash
claude mcp add --scope user cc-recommender -- npx -y cc-recommender
```

`--scope user` makes the server available in all your projects. Run `claude mcp list` to check that it is connected.

To share the setting with a team, add it to `.mcp.json` in the project root instead:

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

### Cursor and other MCP clients

Use the same `mcpServers` entry in the client's MCP configuration file (`~/.cursor/mcp.json` for Cursor).

### Global install

If you would rather not go through `npx` on every start:

```bash
npm install -g cc-recommender
claude mcp add --scope user cc-recommender -- cc-recommender
```

Update it with `npm update -g cc-recommender`.

## Usage

Ask in plain language. Claude picks the tool.

- "What should I install for this project?"
- "Find MCP servers for PostgreSQL."
- "Recommend only skills for testing this repository."
- "Tell me more about playwright-skill."

| Tool | What it does | Parameters |
|------|--------------|------------|
| `recommend_skills` | Analyzes a project and recommends items for it | `project_path` (required), `description`, `types`, `max_results` (1-50, default 20) |
| `search_skills` | Keyword search across all items | `query` (required), `types`, `max_results` |
| `get_skill_details` | Shows the details of one item | `name` (required) |
| `list_categories` | Lists the categories | none |
| `get_stats` | Shows database statistics | none |

`types` narrows the results to any of `plugin`, `mcp`, `skill`, `workflow`, `hook`, `command`, and `agent`.

The project analysis looks at `package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json`, `Gemfile`, `pom.xml`, `build.gradle`, `docker-compose.yml`, and `.env` files, plus framework config files (Next.js, Nuxt, Vite, Prisma, and others) and file extensions.

## Data

| Type | Sources |
|------|---------|
| Plugins | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) |
| MCP servers | [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers), [Official MCP Registry](https://registry.modelcontextprotocol.io) |
| Skills | [anthropics/skills](https://github.com/anthropics/skills), [openai/skills](https://github.com/openai/skills), [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills), [supabase/agent-skills](https://github.com/supabase/agent-skills), [obra/superpowers](https://github.com/obra/superpowers), [lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill), and the lists [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) and [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) |

A GitHub Actions workflow rebuilds the database every day and opens a pull request with the result.

When the server starts, it downloads the latest database from this repository. If the download fails or the data does not pass validation, it uses the copy bundled with the npm package, so it also works offline. To always use the bundled copy, set `CC_RECOMMENDER_OFFLINE_MODE`:

```bash
claude mcp add --scope user cc-recommender -e CC_RECOMMENDER_OFFLINE_MODE=true -- npx -y cc-recommender
```

| Environment variable | Description | Default |
|----------------------|-------------|---------|
| `CC_RECOMMENDER_OFFLINE_MODE` | Skip the remote download and use only the bundled data | `false` |

## Development

You need pnpm 10.

```bash
git clone https://github.com/yuji0809/cc-recommender.git
cd cc-recommender
pnpm install
pnpm run build
pnpm run test
pnpm run check   # type check, lint, cc-audit, license check
```

To try a local build in Claude Code, register `node /path/to/cc-recommender/dist/index.js` as the command.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow, [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the code layout, and [docs/DATA_MANAGEMENT.md](./docs/DATA_MANAGEMENT.md) for how the database is built.

## Security

See [SECURITY.md](./SECURITY.md) for how to report a vulnerability and what the project does to protect its dependencies, CI, and npm releases.

## License

[MIT](./LICENSE)
