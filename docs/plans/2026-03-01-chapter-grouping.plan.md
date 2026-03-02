---
name: Chapter Grouping
overview: Add a chapter layer between projects and scenes — writers can create chapters, assign scenes to chapters, reorder chapters, and move scenes between chapters.
status: done
merged: "2026-03-01"
pr: 8
todos:
  - id: 1
    content: "Add ProjectChapter domain type and embed chapters in WritingProject"
    status: done
    dependencies: []
  - id: 2
    content: "Add chapter CRUD and scene-move operations to ProjectRepository interface"
    status: done
    dependencies: [1]
  - id: 3
    content: "Implement chapter operations in LocalProjectRepository"
    status: done
    dependencies: [2]
  - id: 4
    content: "Create ChapterService in application layer"
    status: done
    dependencies: [3]
  - id: 5
    content: "Build ChapterForm component for creating chapters"
    status: done
    dependencies: []
  - id: 6
    content: "Build ChapterOutlinePanel with chapter/scene hierarchy, reorder, and move"
    status: done
    dependencies: [4, 5]
  - id: 7
    content: "Update project detail page to show chapter outline panel"
    status: done
    dependencies: [6]
  - id: 8
    content: "Wire writing session context across project layout via WritingSessionProvider"
    status: done
    dependencies: []
  - id: 9
    content: "Fix SSR crashes and stabilize useWritingSession hook deps"
    status: done
    dependencies: [8]
---

# Chapter Grouping — Retroactive Plan

> This plan was written retroactively after the feature was merged (PR #8).

**Goal:** Group scenes into chapters. Chapters are ordered within a project; scenes are ordered within a chapter. Writers can reorder chapters (up/down), move scenes between chapters, and see per-chapter word counts.

## Architecture

Chapters are embedded in `WritingProject` (no separate storage key):

```ts
type ProjectChapter = {
  id: string;
  projectId: string;
  title: string;
  sceneOrder: string[];   // ordered scene IDs
  wordCount: number;      // derived, recalculated on mutation
  createdAt: string;
};

type WritingProject = {
  // ... existing fields
  chapterOrder: string[];                      // ordered chapter IDs
  chapters: Record<string, ProjectChapter>;
};
```

New `ChapterService` in `src/application/project/chapter-service.ts` handles: `listChapters`, `createChapter`, `renameChapter`, `deleteChapter`, `reorderChapter`, `moveSceneToChapter`.

## Files Changed

| Action | Path |
|--------|------|
| Modify | `src/domain/project/project.ts` |
| Modify | `src/domain/project/project-repository.ts` |
| Modify | `src/data/project/local-project-repository.ts` |
| Create | `src/application/project/chapter-service.ts` |
| Create | `src/components/workspace/chapter-form.tsx` |
| Create | `src/components/workspace/chapter-outline-panel.tsx` |
| Modify | `src/app/workspace/[projectId]/page.tsx` |
| Create | `src/app/workspace/[projectId]/layout.tsx` |
| Create | `src/context/writing-session-context.tsx` |
| Create | `src/components/writing-session/writing-session-provider-client.tsx` |
| Modify | `src/hooks/use-writing-session.ts` |
| Modify | `src/data/writing-session/local-writing-session-repository.ts` |
| Modify | `src/components/scene/scene-editor-shell.tsx` |
| Modify | `src/test/writing-session/use-writing-session.test.ts` |

## Key Decisions

- **Chapters embedded in project**: no new storage key, chapters live inside `ainkwell.projects.v1` alongside scenes. Keeps the data model simple and avoids cross-key consistency issues
- **`chapterOrder` + `sceneOrder`**: explicit ordering arrays instead of sort fields — matches the existing `scenes` pattern and makes reordering O(1)
- **`WritingSessionProvider` moved to layout**: the session context was previously instantiated per-page; moving it to `[projectId]/layout.tsx` makes it available across scene editor, goals page, and project detail without prop drilling
- **SSR safety fixes**: `WritingSessionProvider` wrapped in a client-only dynamic import to prevent localStorage access during SSR; `useCallback` deps stabilized to prevent session auto-stop on re-render
