---
name: Bible DRY Patterns
overview: Refactor the Story Bible module to remove duplication — extract shared helpers, consolidate state management, and simplify the page controller.
status: done
merged: "2026-02-28"
pr: 5
todos:
  - id: 1
    content: "Extract upsertRecord helper to consolidate bible repository upsert methods"
    status: done
    dependencies: []
  - id: 2
    content: "Extract resolveIdInList to deduplicate ID resolution across form states"
    status: done
    dependencies: []
  - id: 3
    content: "Extract withBibleAction and remove identity function in bible controller"
    status: done
    dependencies: []
  - id: 4
    content: "Remove dead component and deduplicate loading JSX"
    status: done
    dependencies: []
---

# Bible DRY Patterns — Retroactive Plan

> This plan was written retroactively after the feature was merged (PR #5).

**Goal:** The Story Bible module had grown organically with duplicated upsert patterns, repeated ID resolution logic, and a dead component. This refactor cleaned it up without changing any behavior.

## Files Changed

| Action | Path |
|--------|------|
| Refactor | `src/data/bible/local-bible-repository.ts` |
| Refactor | `src/components/bible/bible-editor-utils.ts` |
| Refactor | `src/components/bible/relationship-editor-state.ts` |
| Refactor | `src/components/bible/scene-links-state.ts` |
| Refactor | `src/components/bible/bible-page-controller.ts` |
| Refactor | `src/components/bible/bible-page-client.tsx` |
| Refactor | `src/components/scene/workspace-scene-list.tsx` |

## What Was Done

- **`upsertRecord`** helper extracted in `local-bible-repository.ts` — entities, relationships, and scene-links all had the same "find by id or append" pattern
- **`resolveIdInList`** extracted — relationship editor and scene-links editor both resolved selected IDs from form state the same way
- **`withBibleAction`** extracted in `bible-page-controller.ts` — error handling wrapper around all bible mutations was repeated for every action
- Removed a dead component that was no longer rendered
- Deduplicated loading JSX that appeared in multiple render paths of `bible-page-client.tsx`
