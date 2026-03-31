# Contributing to AutoParts

## Development Workflow

1. Create a feature branch from `main`
2. Make changes with tests
3. Run `pnpm run lint && pnpm run typecheck && pnpm run test`
4. Ensure build passes: `pnpm run build`
5. Submit PR — CI will run automatically

## Code Standards

- TypeScript strict mode
- ESLint + Prettier for formatting
- All new features require tests
- No secrets in code — use environment variables

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`

## Adding a New Package

1. Create directory under `packages/` or `apps/`
2. Add `package.json` with `@autoparts/` scope
3. Add `tsconfig.json` extending `../../tsconfig.base.json`
4. Register in `pnpm-workspace.yaml` (already covered by glob)
