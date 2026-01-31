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

### Versioning Rules

This project uses **[release-please](https://github.com/googleapis/release-please)** for automated releases. The commit type determines how the version number is bumped:

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `fix:` | **patch** | 0.1.1 → 0.1.2 |
| `feat:` | **minor** | 0.1.1 → 0.2.0 |
| `feat!:` or `BREAKING CHANGE:` | **major** | 0.1.1 → 1.0.0 |
| `chore:`, `docs:`, `style:`, etc. | **none** | No version change |

**Important Notes:**
- `feat:` commits trigger a **minor** version bump (new features)
- `fix:` commits trigger a **patch** version bump (bug fixes)
- Breaking changes trigger a **major** version bump
- Other types (`chore:`, `ci:`, `docs:`) do not trigger version changes

**Example Scenarios:**
```bash
# Adds a new feature → 0.1.1 to 0.2.0
git commit -m "feat: add new recommendation algorithm"

# Fixes a bug → 0.1.1 to 0.1.2
git commit -m "fix: resolve analyzer crash on empty files"

# Internal change (no version bump)
git commit -m "chore: update dependencies"

# Breaking change → 0.1.1 to 1.0.0
git commit -m "feat!: redesign API interface"
# or
git commit -m "feat: redesign API interface

BREAKING CHANGE: API interface has changed"
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
│   │   ├── fetchers/         # Data fetching
│   │   │   ├── plugin-fetcher.ts        # Plugin data fetching
│   │   │   ├── mcp-fetcher.ts           # MCP server data (awesome-mcp-servers)
│   │   │   ├── official-mcp-fetcher.ts  # Official MCP registry
│   │   │   └── skill-fetcher.ts         # Skill data fetching
│   │   └── repositories/     # Data access layer
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

### For Maintainers

See [docs/DATA_MANAGEMENT.md](./docs/DATA_MANAGEMENT.md) for the full data management guide.

#### Update Database Manually

```bash
# Full update with security scan
pnpm run fetch-data:full

# Quick update (skip security scan - emergency only)
pnpm run fetch-data:quick

# Default (controlled by SKIP_SECURITY_SCAN env var)
pnpm run fetch-data

# With GitHub token to avoid rate limits (recommended)
GITHUB_TOKEN=your_token_here pnpm run fetch-data
```

**GitHub Token Setup:**
To fetch official skills from GitHub (Anthropic, Supabase, etc.) without hitting rate limits, create a token at https://github.com/settings/tokens with `public_repo` scope and set it as `GITHUB_TOKEN` environment variable.

#### Automatic Weekly Updates

The database is automatically updated every Monday at 9:00 AM JST via GitHub Actions (`.github/workflows/update-data.yml`).

**What happens:**
1. Fetches latest data from all sources
2. Runs security scan with cc-audit
3. Creates a PR if changes detected
4. Maintainer reviews and merges

### For Contributors

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

## Testing

### Running Tests

```bash
# Run all tests
pnpm run test

# Watch mode (re-runs on file changes)
pnpm run test:watch

# Coverage report
pnpm run test:coverage
```

### Test Structure

- `tests/analyzer/` - Project analyzer tests
- `tests/fetchers/` - Fetcher tests
- `tests/recommender/` - Recommender tests

### Writing Tests

- Use Vitest for testing
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies
- Aim for high coverage on critical paths

Example:

```typescript
import { describe, expect, it } from "vitest";

describe("MyService", () => {
  it("should return expected result", () => {
    // Arrange
    const input = "test";

    // Act
    const result = myService.process(input);

    // Assert
    expect(result).toBe("expected");
  });
});
```

## Build and Release

### Building

```bash
# TypeScript compilation
pnpm run build

# Watch mode (rebuilds on file changes)
pnpm run dev
```

### Automated Release Process

This project uses **[release-please](https://github.com/googleapis/release-please)** for fully automated releases.

**How it works:**

1. **Push commits to `main`** using Conventional Commits
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   git push origin main
   ```

2. **release-please automatically creates/updates a Release PR**
   - Automatically determines the version based on commit types
   - Generates CHANGELOG.md
   - Updates package.json version
   - PR title: `chore(main): release X.Y.Z`

3. **Merge the Release PR**
   - Review the generated CHANGELOG
   - Merge when ready to publish
   ```bash
   # Or merge via GitHub UI
   gh pr merge <PR_NUMBER> --squash
   ```

4. **Automatic GitHub Release & NPM Publish**
   - GitHub Release is created automatically
   - Package is published to NPM automatically
   - No manual intervention required!

**Example Workflow:**
```bash
# 1. Make changes with proper commit messages
git checkout -b feature/new-algo
# ... make changes ...
git commit -m "feat: implement advanced scoring algorithm"
git push origin feature/new-algo

# 2. Create and merge PR to main
gh pr create --fill
gh pr merge --squash

# 3. release-please creates a Release PR automatically
# 4. Review and merge the Release PR
# 5. GitHub Release + NPM publish happens automatically!
```

### Manual Release (Emergency Only)

If automated release fails, you can release manually:

```bash
# 1. Update version
npm version patch  # or minor/major

# 2. Create GitHub release
gh release create v0.x.x --generate-notes

# 3. NPM publish happens automatically via GitHub Actions
```

## Questions & Support

- **Issue**: Bug reports and feature requests via [GitHub Issues](https://github.com/yuji0809/cc-recommender/issues)
- **Discussion**: Questions and discussions via [GitHub Discussions](https://github.com/yuji0809/cc-recommender/discussions)

## License

By contributing, you agree that your code will be released under the MIT License.
