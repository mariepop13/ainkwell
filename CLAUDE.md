# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (watch mode)
npm run test:run     # Vitest (single run)
npm run test:ci      # lint + typecheck + test:run (required before commit/PR)
```

Run a single test file:
```bash
npx vitest run src/test/bible/local-bible-repository.test.ts
```

## Architecture

The project follows a strict layered architecture:

```
domain/ → application/ → data/ → components/ → app/
```

- **`src/domain/`** — Pure types, interfaces, and Zod schemas. No implementation. Defines `ProjectRepository` and `BibleRepository` interfaces.
- **`src/application/`** — Business logic services (`ProjectService`, `BibleService`, `SceneEditorService`). Validated via Zod schemas. Depend only on domain interfaces.
- **`src/data/`** — Concrete repository implementations (`LocalProjectRepository`, `LocalBibleRepository`). Both persist exclusively to `window.localStorage`. No cloud/server dependency.
- **`src/components/`** — React components organized by feature (`bible/`, `scene/`, `workspace/`). Page-level controllers (e.g. `bible-page-controller.ts`) are hooks that compose services and manage state.
- **`src/hooks/`** — Shared hooks. `use-scene-editor.ts` implements autosave with 800ms debounce; its runtime refs are isolated in `use-scene-editor-runtime.ts`.
- **`src/app/`** — Next.js App Router pages. All pages are client components (`'use client'`) due to localStorage dependency.

## Local Storage Keys

| Key | Contents |
|-----|----------|
| `ainkwell.projects.v1` | All projects + embedded scenes (JSON) |
| `ainkwell:projects:{id}:bible:v1` | Bible entities/relationships/scene-links per project |
| `ainkwell:projects:{id}:scenes:v1` | Bible's own scene list per project |
| `ainkwell:workspace:v1` | Legacy key — migrated automatically on first read |

## Code Conventions

- **No comments or JSDoc.** Code must be self-explanatory. Functions named as verbs, variables as nouns, no abbreviations.
- **Function size:** 20–40 lines, ≤3–4 params (use objects), early returns, nesting ≤3 levels.
- **File size:** 200–400 lines; split at >400. 1–3 exports per file.
- **Imports order:** Standard lib → third-party → internal (`@/*`).
- **Types:** Explicit on public APIs, always validate at domain boundaries with Zod.
- **Layers:** UI components must not import from `data/`; go through `application/` services.

## Git Workflow

- Branches: `feature/`, `bugfix/`, `hotfix/`, `release/vX.Y.Z`. `main` and `develop` are protected.
- Commit format: `<gitmoji> <intent>: <description>` — intent is one of `feat/fix/refactor/style/perf/docs/build/wip`.
- Commit bullets must list all changed files/components/services, present tense, 3–5+ bullets.

## Testing

- Tests live in `src/test/` mirroring the source structure.
- Test environment: `happy-dom`. Setup file: `src/test/setup.ts` (mocks `matchMedia`, auto-cleanup).
- Tests use Arrange/Act/Assert. One concept per `it` block. Use `describe`/`it` naming.
- `npm run test:ci` must pass before every commit or PR.
