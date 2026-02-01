---
name: pr-description-en
description: "Auto-generate PR description in English from changes against base branch"
tags: ["git", "pr", "automation", "github", "english"]
---

# Instructions

You are tasked with generating a comprehensive Pull Request description in **English** for the current branch.

## Steps to Execute

### 1. Determine Base Branch

Run these commands to detect the base branch:

```bash
BASE_BRANCH=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name 2>/dev/null || echo "main")
echo "Base branch: ${BASE_BRANCH}"
```

### 2. Analyze Changes

Gather commit history and file changes:

```bash
# Get commit messages
git log ${BASE_BRANCH}..HEAD --pretty=format:"%s"

# Get changed files with status
git diff ${BASE_BRANCH}...HEAD --name-status

# Get file statistics
git diff ${BASE_BRANCH}...HEAD --stat
```

### 3. Determine Change Types

Analyze commits and files to determine the type of changes:

- **🐛 Bug fix**: Commits starting with `fix:`
- **✨ New feature**: Commits starting with `feat:` or new files in `src/`
- **💥 Breaking change**: Commits with `BREAKING CHANGE` or `feat!:`, `fix!:`
- **📝 Documentation update**: Commits starting with `docs:` or only `*.md` changes
- **🎨 Code style update**: Commits starting with `style:`
- **♻️ Refactoring**: Commits starting with `refactor:`
- **⚡ Performance improvement**: Commits starting with `perf:`
- **✅ Test update**: Commits starting with `test:` or only `*.test.ts` changes

### 4. Check for Existing PR

```bash
gh pr view --json url,title,state 2>/dev/null
```

If a PR exists, ask the user if they want to update it or just view the generated description.

### 5. Generate PR Description

Create a comprehensive PR description in **English** following the template at `.github/PULL_REQUEST_TEMPLATE.md`:

**Structure:**
- **Description**: Summarize all changes from commit messages
- **Changed Files**: List new and modified files with brief explanations
- **Motivation and Context**: Explain why these changes are needed
- **Type of Change**: Check all applicable boxes based on analysis
- **How Has This Been Tested**: Indicate test commands run
- **Checklist**: Mark completed items
- **Additional Notes**: Include implementation approach, future enhancements, breaking changes (if any)

**Important:**
- Write in clear, professional English
- Be concise but comprehensive
- Include file statistics (files changed, insertions, deletions)
- Group changes by category (new files vs modified files)
- Add co-authorship line: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`

### 6. Update or Create PR

If PR exists:
```bash
# Save description to temporary file
# Update PR with: gh pr edit --body-file /tmp/pr-description.md
```

If no PR exists:
```bash
# Ask user if they want to create a new PR
# If yes: gh pr create --title "..." --body-file /tmp/pr-description.md --base ${BASE_BRANCH}
```

### 7. Clean Up

Remove temporary files and show the PR URL to the user.

## Output Format

Present the generated description to the user in a readable format, and confirm before updating/creating the PR.

**Example Output:**

```
✓ Base branch detected: main
✓ Analyzing 8 commits across 21 files...
✓ Generated PR description (English)

[Show preview of generated description]

PR: https://github.com/owner/repo/pull/123
Status: Updated successfully
```

## Notes

- Always generate descriptions in **English**
- Use professional, technical writing style
- Be specific about what changed and why
- Include test coverage information
- Follow Conventional Commits format for change type detection
