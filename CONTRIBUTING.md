# Contributing Guide

Thank you for your interest in contributing to cc-recommender!

## Important Documentation

Before you start development, please review the following documents:

- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines, coding standards, architecture principles
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Detailed architecture documentation

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 10.0.0

### Setup Steps

1. Fork the repository
2. Clone

```bash
git clone https://github.com/your-username/cc-recommender.git
cd cc-recommender
```

3. Install dependencies

```bash
pnpm install
```

4. Create a branch

```bash
git checkout -b feature/your-feature-name
```

## Code Quality Standards

This project uses the following tools for code quality management:

### Biome (Linter + Formatter)

- **Auto-format**: Automatically runs on file save (recommended setup)
- **Strict rules**: OSS project-level quality standards
- **Fast**: Built with Rust for high performance

```bash
# Check
pnpm run lint

# Auto-fix
pnpm run lint:fix

# Format only
pnpm run format
```

### TypeScript

- **strict mode**: Strict type checking enabled
- **noUnusedLocals**: Disallow unused variables
- **noUnusedParameters**: Disallow unused parameters

```bash
# Type check
pnpm run typecheck
```

### Security Audit (cc-audit)

- **MCP server scanning**: Scans for security vulnerabilities in MCP servers
- **100+ detection rules**: Covers exfiltration, escalation, persistence, and injection attacks
- **CI integration**: Automatically runs during checks

```bash
# Run security audit
pnpm run audit
```

### Git Hooks (Husky)

Automatically runs before commit:

1. **lint-staged**: Checks only changed files
2. **Type check**: Verifies no TypeScript type errors
3. **Security audit**: Scans for security vulnerabilities

**Important**: If commit fails, fix the errors and commit again.

```bash
# After fixing errors
pnpm run lint:fix
git add .
git commit -m "fix: ..."
```

## Commit Message Convention

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no functional changes)
- `refactor`: Refactoring
- `perf`: Performance improvements
- `test`: Adding/fixing tests
- `chore`: Build/configuration changes

### Examples

```bash
git commit -m "feat(recommender): add support for custom scoring weights"
git commit -m "fix(analyzer): handle missing package.json gracefully"
git commit -m "docs(readme): update installation instructions"
```

## Pull Requests

1. **Tests**: Ensure all checks pass

```bash
pnpm run check
pnpm run build
```

2. **Description**: Clearly describe your changes
   - What was changed
   - Why it was changed
   - How it was tested

3. **Review**: Respond to feedback

## Project Structure

See [CLAUDE.md](./CLAUDE.md) and [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for details.

```
cc-recommender/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── config/               # Configuration
│   ├── repositories/         # Data access layer
│   ├── utils/                # Utilities
│   ├── types/                # Type definitions
│   ├── schemas/              # Zod validation schemas
│   ├── services/             # Business logic
│   │   ├── analyzer/         # Project analysis
│   │   ├── recommender/      # Recommendation logic
│   │   ├── plugin-fetcher.ts # Plugin data fetching
│   │   ├── mcp-fetcher.ts    # MCP server data fetching
│   │   └── skill-fetcher.ts  # Skill data fetching
│   ├── tools/                # MCP tools
│   │   └── handlers/         # Tool implementations
│   └── server/               # Server setup
├── data/
│   └── recommendations.json  # Unified database
├── scripts/
│   └── fetch-data.ts         # Data fetch script
├── tests/                    # Test files
├── .husky/                   # Git hooks
├── docs/                     # Technical documentation
│   └── ARCHITECTURE.md      # Architecture details
├── CLAUDE.md                 # Development guidelines (Important!)
├── CONTRIBUTING.md           # Contribution guide
├── CHANGELOG.md              # Change history
├── biome.json               # Biome configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Project configuration
```

## Coding Standards

**Important**: See [CLAUDE.md](./CLAUDE.md) for detailed coding standards and architecture guidelines.

### Key Rules

1. **index.ts is generally prohibited** - except for `types/` and `tools/handlers/`
2. **Use type** - Do not use interface
3. **Follow layer dependency direction** - Upper → Lower only
4. **Single Responsibility Principle** - Each file should have only one responsibility

### Naming Conventions

- **Files**: kebab-case + suffix (`plugin-fetcher.service.ts`)

## Data Updates

To add a new data source:

1. Add fetcher to `scripts/fetch-data.ts`
2. Add type definitions to `src/types/` (domain-types.ts, raw-types.ts, etc.)
3. Export as public API in `src/types/index.ts`
4. Run tests

```bash
pnpm run fetch-data
pnpm run build
pnpm run check
```

## Questions & Support

- **Issue**: Bug reports and feature requests via [GitHub Issues](https://github.com/yuji0809/cc-recommender/issues)
- **Discussion**: Questions and discussions via [GitHub Discussions](https://github.com/yuji0809/cc-recommender/discussions)

## License

By contributing, you agree that your code will be released under the MIT License.
