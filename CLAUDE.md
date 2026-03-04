# LinkedCtl — Claude Instructions

> Development guidelines for AI-assisted development of LinkedCtl

## Project Overview

**LinkedCtl** is a CLI and MCP server for the [LinkedIn](https://www.linkedin.com) API, published as `linkedctl` on npm.

- **License**: AGPL-3.0-only
- **Runtime**: Node.js >= 24, ESM only
- **Language**: TypeScript (strict mode, ES2024 target, NodeNext modules)

## Repository Structure

```
linkedctl/
  packages/
    core/       → @linkedctl/core  (LinkedIn API client, OAuth2, services)
    cli/        → @linkedctl/cli   (CLI commands, program definition)
    mcp/        → @linkedctl/mcp   (MCP server)
    linkedctl/  → linkedctl        (umbrella: CLI + MCP compose)
    e2e/        → @linkedctl/e2e   (private, E2E tests)
  scripts/
    check-licenses.js             (SPDX license compliance)
    check-publish-manifest.js     (publish manifest validation)
```

## Package Dependency Graph

```
core ← cli ← linkedctl (umbrella)
core ← mcp ←┘
core ← cli ← e2e (private, all packages)
core ← mcp ←┘
```

- `core` has no internal dependencies (leaf package)
- `cli` and `mcp` depend on `core`
- `linkedctl` (umbrella) composes `cli` + `mcp`
- `e2e` depends on all publishable packages

## Development Commands

```sh
pnpm install          # Install dependencies
pnpm build            # Build all packages (via Turbo)
pnpm test             # Run unit tests
pnpm test:e2e         # Run E2E tests (sequential)
pnpm format:check     # Check Prettier formatting
pnpm typecheck        # Type-check all packages (via Turbo)
pnpm lint             # Lint all packages
pnpm license-check    # Verify dependency licenses
pnpm publish-check    # Validate publish manifests
pnpm dev              # Watch mode
```

## Conventions

### Source Files

Every `.ts` and `.js` file MUST start with:

```ts
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Oleksii PELYKH
```

ESLint enforces this via `eslint-plugin-header`.

### Commit Messages

- Format: `(type) lowercase message` — e.g. `(feat) add post creation`
- Types: `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`, `test`
- Reference issues: `(fix) resolve oauth token refresh (#12)`
- One logical change per commit

### Formatting

- Prettier with default configuration (no overrides)
- EditorConfig: 2-space indent for `.ts`, `.js`, `.json`, `.yaml`/`.yml`; LF line endings; UTF-8
- Max line length: 120 (EditorConfig)

### Dependencies

- Production dependencies must have licenses compatible with AGPL-3.0-only
- Allowed licenses: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, BlueOak-1.0.0, Unlicense, CC0-1.0, CC-BY-3.0, CC-BY-4.0 (see `scripts/check-licenses.js`)
- Use `workspace:^` for inter-package dependencies
- Use `catalog:` references in `pnpm-workspace.yaml` for shared version management
- Pin GitHub Actions to commit SHAs with version comments (e.g., `# v6.0.2`)

### Testing

- Unit tests: `*.test.ts` (co-located with source)
- E2E tests: `*.e2e.test.ts`
- Coverage thresholds: statements 85%, branches 75%, functions 80%, lines 85%

### TypeScript

- Strict mode with `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`
- Use `verbatimModuleSyntax` (explicit `type` imports)
- All packages use `composite: true` with project references
- ESLint uses `tseslint.configs.strictTypeChecked` (strict type-aware rules)

### Package Exports

Each package uses conditional exports with `types` + `import`:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  }
}
```

### Local Files

- `*.local.*` pattern is gitignored for developer-local configuration
- `.mcp.json.local` for local MCP credentials

## CI/CD

- **CI**: Runs on push/PR to `main`; 3-OS matrix (ubuntu, macos, windows); format-checks, builds, type-checks, lints, license-checks, publish-checks, tests
- **Release**: Triggered by GitHub Release publish; validates, stamps version from git tag, publishes to npm with provenance
- **Setup**: Composite action at `.github/actions/setup/` (pnpm + Node.js 24 + frozen lockfile + Turbo cache)
- Coverage uploaded to Codecov on ubuntu only

### Branch Protection

The `main` branch is protected with the following rules:

- **Require status checks to pass**: The `CI` job (ci-gate) must pass before merging
- **Require linear history**: Rebase-only merge strategy
- **No force push**: Force pushes to `main` are blocked
