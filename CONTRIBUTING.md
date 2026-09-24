# Contributing to @piplup/libaddressinput

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

Be respectful, inclusive, and professional. We're all here to build something great together.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 11+ (package manager)
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/piplup/libaddressinput
cd libaddressinput

# Install dependencies
pnpm install

# Build packages
pnpm build

# Run tests
pnpm test
```

### Development Commands

```bash
# Run tests in watch mode
pnpm test:watch

# Run linter
pnpm lint

# Run type checker
pnpm typecheck

# Format code
pnpm fmt

# Build all packages
pnpm build
```

## Making Changes

### Branch Strategy

1. Create a new branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes with clear, descriptive commits:
   ```bash
   git commit -m "feat(core): add dispose method to form controller"
   ```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`  
**Scope**: `core`, `react`, `examples`, `docs`  
**Subject**: Imperative mood, lowercase, no period

Examples:

- `feat(core): add dispose method for resource cleanup`
- `fix(react): correct useAddress dependency array`
- `docs(core): update README with dispose examples`
- `test(core): add tests for debounce cleanup`

### Code Style

- Use TypeScript for type safety
- Follow existing code patterns
- No `any` types—use proper typing
- ESLint and Prettier are configured—run `pnpm fmt` before committing

### Testing

All changes must include tests:

```bash
# Add tests in `*.test.ts` or `*.test.tsx` files
# Run tests locally before submitting PR
pnpm test

# Check coverage
pnpm test -- --coverage
```

Tests use [Vitest](https://vitest.dev/). Follow existing test patterns.

### Documentation

- Update README files if changing public APIs
- Add JSDoc comments to exported functions/types
- Update CHANGELOG.md with user-facing changes

## Submitting Changes

### Pull Request Process

1. Push your branch to GitHub:

   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a pull request with:
   - Clear title following Conventional Commits
   - Description of changes and motivation
   - Link to related issues if applicable
   - Screenshots for UI changes

3. Address review feedback

4. Ensure all checks pass (tests, types, linting)

### PR Checklist

- [ ] Tests added/updated
- [ ] Code follows style guide (`pnpm fmt`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Commits follow Conventional Commits format

## Review Process

- At least one maintainer review required
- Be open to feedback and iterative refinement
- Discussions are respectful and collaborative

## Project Structure

```
libaddressinput/
├── packages/
│   ├── core/              # @piplup/libaddressinput (main library)
│   └── react/             # @piplup/libaddressinput-react (React bindings)
├── examples/              # Example applications (not published)
├── test/                  # Test fixtures and utilities
├── .github/workflows/     # CI/CD pipelines
├── .planning/             # Project planning documents
└── CONTRIBUTING.md        # This file
```

### Core Package (`packages/core`)

The main library with:

- Address validation, formatting, normalization
- Form state controller (`createAddressForm`)
- Data suppliers and storage
- UI helpers

### React Package (`packages/react`)

React hooks and context:

- `useAddress`, `useCountries`, `useField`, etc.
- `AddressProvider`, `AddressContext`
- Integration with core library

### Examples

Runnable applications showing usage:

- Node.js CLI (no UI)
- Vanilla DOM (plain HTML)
- React basic (useState)
- React form controller (advanced)

Examples are NOT published to npm—they're reference implementations.

## Debugging

### Run Tests with Debugging

```bash
# Run specific test file
pnpm test src/form/controller.test.ts

# Run tests matching pattern
pnpm test -- --grep "dispose"

# Debug in VS Code
node --inspect-brk node_modules/.bin/vitest
```

### Check Package Contents

```bash
# See what will be published
npm pack --dry-run

# Check exports
node -e "import('@piplup/libaddressinput').then(m => console.log(m))"
```

## Release Process

Releases are handled by maintainers using automated workflows:

1. Changelog is generated from commits
2. Versions are bumped using Conventional Commits
3. Packages are built and published to npm
4. Release notes are created on GitHub

For maintainers only—see `.github/workflows/release.yml`

## Questions?

- Check [discussions](https://github.com/piplup/libaddressinput/discussions)
- File an [issue](https://github.com/piplup/libaddressinput/issues)
- Ask in PR comments

## License

By contributing, you agree that your contributions will be licensed under Apache-2.0 (see [LICENSE](LICENSE)).

---

Thank you for contributing! 🎉
