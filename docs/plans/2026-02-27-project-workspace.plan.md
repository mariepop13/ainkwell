---
name: Project Workspace
overview: Build the full project management layer — domain types, localStorage repository, application service, and workspace UI with project CRUD.
status: done
merged: "2026-02-27"
pr: 2
todos:
  - id: 1
    content: "Define WritingProject domain type and Zod schema"
    status: done
    dependencies: []
  - id: 2
    content: "Define ProjectRepository interface"
    status: done
    dependencies: [1]
  - id: 3
    content: "Implement LocalProjectRepository persisting to localStorage"
    status: done
    dependencies: [2]
  - id: 4
    content: "Build ProjectService with CRUD operations"
    status: done
    dependencies: [3]
  - id: 5
    content: "Build workspace page with project list"
    status: done
    dependencies: [4]
  - id: 6
    content: "Build project detail page"
    status: done
    dependencies: [4]
  - id: 7
    content: "Build ProjectForm, ProjectCard, ProjectFormFields components"
    status: done
    dependencies: [5]
  - id: 8
    content: "Write tests for project repository and service"
    status: done
    dependencies: [4]
---

# Project Workspace — Retroactive Plan

> This plan was written retroactively after the feature was merged (PR #2).

**Goal:** A writer can create, view, edit, and delete writing projects from a central workspace. Each project has a title, description, language, and optional target word count.

## Architecture

First full vertical slice of the layered architecture:

```
domain/project/ → application/project/ → data/project/ → components/workspace/ → app/workspace/
```

Storage key: `ainkwell.projects.v1` — a JSON map of `{ [projectId]: WritingProject }`.

## Files Changed

| Action | Path |
|--------|------|
| Create | `src/domain/project/project.ts` |
| Create | `src/domain/project/project-repository.ts` |
| Create | `src/data/project/local-project-repository.ts` |
| Create | `src/application/project/project-service.ts` |
| Create | `src/components/workspace/project-card.tsx` |
| Create | `src/components/workspace/project-form.tsx` |
| Create | `src/components/workspace/project-form-fields.tsx` |
| Create | `src/app/workspace/page.tsx` |
| Create | `src/app/workspace/[projectId]/page.tsx` |
| Modify | `src/app/page.tsx` |
| Modify | `README.md` |

## Key Decisions

- **All pages are `'use client'`** — localStorage is only available client-side; rather than shimming SSR, every page opts into client rendering explicitly
- **Projects stored as a flat map** — `Record<string, WritingProject>` in a single localStorage key; simple to read/write, no joins needed at this scale
- **Zod validation at boundaries** — all `ProjectService` inputs are validated with Zod schemas before touching storage, even though this is local-only (protects against localStorage corruption)
