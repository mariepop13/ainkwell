---
name: Story Bible
overview: Build a full worldbuilding and continuity system — writers can create bible entities (characters, locations, factions, lore), define relationships between them with cycle detection, and link entities to specific scenes.
status: done
merged: "2026-02-28"
pr: 4
todos:
  - id: 1
    content: "Define BibleEntity, BibleRelationship, BibleSceneLink domain types and Zod schemas"
    status: done
    dependencies: []
  - id: 2
    content: "Define BibleRepository interface with entity, relationship, and scene-link operations"
    status: done
    dependencies: [1]
  - id: 3
    content: "Implement LocalBibleRepository persisting to localStorage"
    status: done
    dependencies: [2]
  - id: 4
    content: "Build BibleService with CRUD, cycle detection, tag limits, scope enforcement"
    status: done
    dependencies: [3]
  - id: 5
    content: "Build BiblePageController hook composing all bible state"
    status: done
    dependencies: [4]
  - id: 6
    content: "Build BibleList component with search and category filter"
    status: done
    dependencies: [5]
  - id: 7
    content: "Build BibleEditor component for entity create/edit"
    status: done
    dependencies: [5]
  - id: 8
    content: "Build RelationshipEditor component with cycle detection UI"
    status: done
    dependencies: [5]
  - id: 9
    content: "Build SceneLinks component for entity-scene linking"
    status: done
    dependencies: [5]
  - id: 10
    content: "Build BiblePageClient 4-column layout"
    status: done
    dependencies: [6, 7, 8, 9]
  - id: 11
    content: "Add /workspace/[projectId]/bible page route"
    status: done
    dependencies: [10]
  - id: 12
    content: "Add bible entry point to project detail page"
    status: done
    dependencies: [11]
---

# Story Bible — Retroactive Plan

> This plan was written retroactively after the feature was merged (PR #4).

**Goal:** Writers maintain a structured reference of their story world. They can define entities (characters, locations, factions, lore), draw relationships between them, and annotate which scenes each entity appears in.

## Architecture

Separate storage key per project: `ainkwell:projects:{id}:bible:v1`

Stores: `{ entities: BibleEntity[], relationships: BibleRelationship[], sceneLinks: BibleSceneLink[], scenes: BibleScene[] }`

`BiblePageController` is a hook that composes `BibleService` and manages all bible UI state in one place (selected entity, active editor mode, search query, category filter). This avoids prop-drilling across the 4-column layout.

## Domain

```ts
type BibleEntity = {
  id, projectId, category, name, summary, details, tags, createdAt, updatedAt
}
// category: 'character' | 'location' | 'faction' | 'lore'

type BibleRelationship = {
  id, projectId, type, fromEntityId, toEntityId, notes, createdAt, updatedAt
}
// 10 relationship types: ally_of, enemy_of, member_of, located_in,
//   parent_of, sibling_of, mentor_of, rival_of, controls, knows

type BibleSceneLink = {
  id, projectId, sceneId, entityId, notes, createdAt, updatedAt
}
```

## Files Changed

| Action | Path |
|--------|------|
| Create | `src/domain/bible/types.ts` |
| Create | `src/domain/bible/repository.ts` |
| Create | `src/data/bible/local-bible-repository.ts` |
| Create | `src/application/bible/bible-service.ts` |
| Create | `src/components/bible/bible-page-controller.ts` |
| Create | `src/components/bible/bible-page-client.tsx` |
| Create | `src/components/bible/bible-list.tsx` |
| Create | `src/components/bible/bible-editor.tsx` |
| Create | `src/components/bible/relationship-editor.tsx` |
| Create | `src/components/bible/relationship-editor-state.ts` |
| Create | `src/components/bible/scene-links.tsx` |
| Create | `src/components/bible/scene-links-state.ts` |
| Create | `src/components/bible/bible-editor-utils.ts` |
| Create | `src/app/workspace/[projectId]/bible/page.tsx` |
| Modify | `src/app/workspace/[projectId]/page.tsx` |
| Modify | `src/app/layout.tsx` |

## Key Decisions

- **Cycle detection in relationships** — `BibleService.saveRelationship` runs a BFS/DFS before persisting to prevent circular chains (A → B → A). This preserves graph integrity even though it's local-only
- **Project scope enforcement** — every operation validates that the entity/relationship/link belongs to the current project, preventing cross-project data leaks
- **`BiblePageController` as a single hook** — the bible page has 4 interactive columns; a single controller hook is cleaner than threading callbacks through 4 levels of components
- **Separate storage key** — bible data is isolated from project data (`ainkwell:projects:{id}:bible:v1`) to keep individual localStorage entries small and avoid parsing the entire project on every bible operation
