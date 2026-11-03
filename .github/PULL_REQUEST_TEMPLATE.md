## Summary

<!-- What does this change, and why? Mention anything reviewers should look at closely. -->

## Related issue

<!-- e.g. Closes #123. Write "None" if there is no issue. -->

## Checklist

- [ ] `pnpm run check` passes (typecheck, lint, cc-audit, license check)
- [ ] `pnpm run test` passes, and new behavior has tests
- [ ] `pnpm run build` passes
- [ ] Commit messages follow Conventional Commits (`fix:`, `feat:`, `docs:`, ...)
- [ ] If a workflow `uses:` line changed, `.github/workflows/actions.lock` is updated (`gh actions-lock`)
- [ ] Docs are updated if behavior or commands changed

<!-- Don't edit CHANGELOG.md or the package version. release-please handles both. -->
