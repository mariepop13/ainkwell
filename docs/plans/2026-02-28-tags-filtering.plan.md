---
name: Tags Filtering
overview: Add multi-tag support to Bible entities — writers can tag characters/locations/etc. and filter the entity list by one or more tags.
status: done
merged: "2026-02-28"
pr: 6
todos:
  - id: 1
    content: "Add tags field to BibleEntity domain type (max 12 unique tags)"
    status: done
    dependencies: []
  - id: 2
    content: "Add listAllTags query and tag filtering to BibleRepository interface"
    status: done
    dependencies: [1]
  - id: 3
    content: "Implement tags persistence and filtering in LocalBibleRepository"
    status: done
    dependencies: [2]
  - id: 4
    content: "Update BibleService to expose listAllTags and pass tag filters"
    status: done
    dependencies: [3]
  - id: 5
    content: "Build TagsInput component for multi-tag entry in entity editor"
    status: done
    dependencies: []
  - id: 6
    content: "Build TagChip component for tag display"
    status: done
    dependencies: []
  - id: 7
    content: "Build TagFilterPanel for filtering entity list by tags"
    status: done
    dependencies: [6]
  - id: 8
    content: "Wire tag filtering into bible page controller, list, and editor"
    status: done
    dependencies: [4, 5, 7]
  - id: 9
    content: "Write tests for tag filtering in repository and page"
    status: done
    dependencies: [8]
---

# Tags Filtering — Retroactive Plan

> This plan was written retroactively after the feature was merged (PR #6).

**Goal:** Let writers label bible entities with tags (e.g. "protagonist", "chapter-1", "deceased") and filter the entity list by clicking tags.

## Architecture

`tags: string[]` added to `BibleEntity`. Max 12 unique tags per entity. Tags are lowercase strings, no spaces enforced at the UI level. `listAllTags(projectId)` returns all unique tags across entities for populating the filter panel.

## Files Changed

| Action | Path |
|--------|------|
| Modify | `src/domain/bible/types.ts` |
| Modify | `src/domain/bible/repository.ts` |
| Modify | `src/data/bible/local-bible-repository.ts` |
| Modify | `src/application/bible/bible-service.ts` |
| Create | `src/components/bible/tags-input.tsx` |
| Create | `src/components/bible/tag-chip.tsx` |
| Create | `src/components/bible/tag-filter-panel.tsx` |
| Modify | `src/components/bible/bible-editor.tsx` |
| Modify | `src/components/bible/bible-list.tsx` |
| Modify | `src/components/bible/bible-page-client.tsx` |
| Modify | `src/components/bible/bible-page-controller.ts` |
| Modify | `src/test/bible/bible-page.test.tsx` |
| Modify | `src/test/bible/local-bible-repository.test.ts` |

## Key Decisions

- Max 12 tags per entity to prevent abuse and keep the filter panel manageable
- Tags stored as plain `string[]` in the entity — no separate tags collection
- `TagFilterPanel` uses multi-select: clicking a tag toggles it, entity list shows entities that have ALL selected tags (AND logic)
- `TagsInput` uses comma-separated entry with duplicate deduplication
