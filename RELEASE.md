# Release Process

This document describes how to release new versions of @piplup/libaddressinput packages.

## Overview

Releases are automated using GitHub Actions workflows (self-hosted runner) that:

1. Validate commits follow Conventional Commits format
2. Generate changelog from commit messages
3. Bump versions (patch, minor, major)
4. Build and test packages (Node 18, 20, 22)
5. Publish to npm on main branch only
6. Create GitHub releases with notes

## Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0) - Breaking API changes
- **MINOR** (0.X.0) - New features, backward compatible
- **PATCH** (0.0.X) - Bug fixes, backward compatible

### Version Bumping Rules

Based on [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` → MINOR version bump
- `fix:` → PATCH version bump
- `BREAKING CHANGE:` footer → MAJOR version bump
- `refactor:`, `docs:`, `style:`, `test:`, `chore:` → No version bump (pre-release only)

## Commit Message Requirements

All commits merged to `main` must follow Conventional Commits:

```
<type>(<scope>): <subject>

<optional body>

<optional footer>
```

### Examples

```
feat(core): add dispose method to form controller

- Adds explicit resource cleanup for pending timers
- Clears listeners on form discard
- Matches Socket.io and PocketBase patterns

Closes #123

feat(react)!: remove deprecated useAddressField hook

BREAKING CHANGE: useAddressField has been removed in favor of useField
```

```
fix(core): prevent debounce timeout leak on form abandon

Fixes #456
```

```
docs(core): improve README examples
```

## Release Workflow

### 1. Prepare Release Branch

Maintainers create a release PR:

```bash
# Create release branch (auto-generated)
git checkout -b release/v0.1.0

# Bump versions in package.json files (automated)
# Update CHANGELOG.md (automated)

# Push and create PR
git push origin release/v0.1.0
```

### 2. Review and Merge

- Review changelog and version bumps
- Ensure all tests pass (runs on self-hosted runner)
- Merge to `main`

### 3. Automated Publishing

When merged to `main`, GitHub Actions (self-hosted runner) automatically:

1. **Validate** - Checks commit messages, tests, types, linting
2. **Build** - Compiles TypeScript, bundles packages
3. **Test** - Runs full test suite
4. **Publish** - Publishes to npm registry
5. **Release** - Creates GitHub release with changelog

## Manual Release (if needed)

If automated release fails on self-hosted runner:

```bash
# Ensure you have npm token configured
export NPM_TOKEN="your-token-here"

# Verify on local machine first
node scripts/verify.js

# Build packages
pnpm build

# Run tests one more time
pnpm test

# Publish to npm (from root)
pnpm -r publish --access public

# Create GitHub release (manual)
gh release create v0.1.0 --generate-notes
```

## Version Files

Versions are defined in package.json files:

- `package.json` - Root
- `packages/core/package.json`
- `packages/react/package.json`

All packages are versioned together (monorepo style).

## Changelog Format

Changelog follows [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New features

### Changed

- Changes to existing features

### Fixed

- Bug fixes

### Removed

- Deprecated features

### Breaking

- Breaking changes (in unreleased)
```

## npm Access

Publishing requires npm credentials:

1. **Create account** at https://www.npmjs.com
2. **Configure locally**:
   ```bash
   npm adduser
   ```
3. **Enable 2FA** (recommended)
4. **Create token** for CI/CD
5. **Add to GitHub Secrets** as `NPM_TOKEN`

## GitHub Release Notes

Release notes are auto-generated from:

- Commit messages
- PR titles
- Issue references

Format:

```markdown
# v0.1.0

## What's Changed

### New Features

- Add dispose method to form controller

### Bug Fixes

- Fix debounce timeout leak on form abandon

### Improvements

- Optimize React hook dependencies

**Full Changelog**: https://github.com/piplup/libaddressinput/compare/v0.0.0...v0.1.0
```

## Pre-release Versions

For alpha/beta testing:

```
v0.1.0-alpha.0
v0.1.0-alpha.1
v0.1.0-beta.0
v0.1.0-rc.0
```

Pre-releases use tag format: `v0.1.0-alpha.0`

## Rollback

If a release has critical bugs:

1. Create hotfix branch from release tag
2. Fix issue
3. Release with incremented patch (v0.1.1)
4. Document in changelog

```bash
git checkout -b hotfix/v0.1.1 v0.1.0
# Make fix
git tag v0.1.1
git push origin hotfix/v0.1.1 --tags
```

## Checklist

Before releasing:

- [ ] All PRs merged to `main`
- [ ] All tests passing
- [ ] No type errors
- [ ] No lint errors
- [ ] CHANGELOG.md updated
- [ ] README examples updated if needed
- [ ] Commit messages follow Conventional Commits

## Support

For release issues:

- Check CI logs: https://github.com/piplup/libaddressinput/actions
- Check npm registry: https://www.npmjs.com/package/@piplup/libaddressinput
- Ask in GitHub Discussions

## References

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [npm Releases](https://docs.npmjs.com/cli/v8/commands/npm-publish)
