# Ainkwell

Base project aligned with the `mivoa` stack:
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui conventions
- Local-first bootstrap (no required cloud provider)
- Vitest + Testing Library
- GitHub Actions + CodeRabbit

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

## Quality commands

```bash
npm run lint
npm run typecheck
npm run test:ci
npm run build
```

## Workspace

The local-first workspace is available at `/workspace`.

- Create projects with title, description, language, and optional target word count.
- Edit and delete projects directly from the workspace list.
- Open `/workspace/[projectId]` to access project details and feature placeholders.
- Project data persists in browser local storage using the `ainkwell.projects.v1` key.

To reset local workspace data manually, remove `ainkwell.projects.v1` from browser local storage.
