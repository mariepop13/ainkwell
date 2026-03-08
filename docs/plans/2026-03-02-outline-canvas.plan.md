---
name: outline-canvas
overview: |
  The Outline Canvas is a storyboard-style view where a writer can see every chapter and its
  scenes laid out as cards in a horizontal swim-lane layout. Scenes can be dragged between
  chapters, reordered within a chapter, and edited inline (title, status, synopsis) without
  leaving the canvas. This is the iconic NovelCrafter feature — the bird's-eye view of an
  entire manuscript's structure — and it gives writers a spatial mental model of their work
  that the linear chapter-outline panel cannot provide.
todos:
  - id: 1
    content: "Add reorderScene operation to ProjectRepository interface and LocalProjectRepository"
    status: done
    dependencies: []
  - id: 2
    content: "Add updateSceneInline operation (title + status + synopsis patch) to ProjectRepository and LocalProjectRepository"
    status: done
    dependencies: []
  - id: 3
    content: "Extend ChapterService with reorderScene and updateSceneInline methods"
    status: done
    dependencies: [1, 2]
  - id: 4
    content: "Add Zod schema and type for reorderSceneInput and updateSceneInlineInput"
    status: done
    dependencies: [1, 2]
  - id: 5
    content: "Build SceneCard component (title badge, status badge, synopsis preview, drag handle)"
    status: done
    dependencies: []
  - id: 6
    content: "Build InlineSceneEditor component (editable title, status selector, synopsis field)"
    status: done
    dependencies: [5]
  - id: 7
    content: "Build ChapterColumn component (header with chapter title, ordered list of SceneCards, empty drop zone)"
    status: done
    dependencies: [5, 6]
  - id: 8
    content: "Build OutlineCanvas component composing ChapterColumns with horizontal scroll and DnD context"
    status: done
    dependencies: [7]
  - id: 9
    content: "Build useOutlineCanvas hook — loads project, dispatches optimistic updates, calls services on drop/reorder/inline-edit"
    status: done
    dependencies: [3, 8]
  - id: 10
    content: "Create outline page at /workspace/[projectId]/outline"
    status: done
    dependencies: [8, 9]
  - id: 11
    content: "Add Outline Canvas link to project detail page navigation"
    status: done
    dependencies: [10]
  - id: 12
    content: "Write unit tests for reorderScene in LocalProjectRepository"
    status: done
    dependencies: [1]
  - id: 13
    content: "Write unit tests for updateSceneInline in LocalProjectRepository"
    status: done
    dependencies: [2]
  - id: 14
    content: "Write unit tests for useOutlineCanvas hook"
    status: done
    dependencies: [9]
  - id: 15
    content: "Write component test for OutlineCanvas (render, add scene, inline edit)"
    status: done
    dependencies: [10]
---

## Overview

The Outline Canvas gives writers a storyboard view of their entire manuscript. Every chapter is a swim-lane column; every scene is a draggable card within that column. Writers drag cards to reorder scenes within a chapter or move them to another chapter. Clicking a card expands an inline editor for title, status (draft / revise / final), and synopsis without leaving the canvas. The feature requires no new storage keys — all data lives inside the existing `ainkwell.projects.v1` localStorage entry that `LocalProjectRepository` already owns.

---

## Architecture / Data Model

### What stays the same

- `WritingProject`, `ProjectChapter`, `ProjectScene` domain types are unchanged.
- `ainkwell.projects.v1` storage key and its v3 schema are unchanged.
- `ChapterService`, `SceneEditorService`, `LocalProjectRepository`, and all existing operations are unchanged.
- The linear `ChapterOutlinePanel` on the project detail page stays; the canvas is an additional view via a dedicated route.

### What changes

#### Two new repository operations

**1. `reorderScene`** — moves a scene to a new index within its own chapter or across chapters with an explicit position index.

```ts
export type ReorderSceneInput = {
  projectId: string;
  sceneId: string;
  targetChapterId: string;
  targetIndex: number;   // 0-based insertion index
};
```

**2. `updateSceneInline`** — patches title, status, and/or synopsis on a scene without touching `content` or `beats`.

```ts
export type UpdateSceneInlineInput = {
  projectId: string;
  sceneId: string;
  title?: string;
  status?: SceneStatus;
  synopsis?: string;
};
```

Both operations are added to `ProjectRepository` (interface) and implemented in `LocalProjectRepository`. Both run `withRecalculatedStats` before persisting.

#### Extended `ChapterService`

```ts
reorderScene(input: ReorderSceneInput): Promise<void>;
updateSceneInline(input: UpdateSceneInlineInput): Promise<ProjectScene>;
```

#### New Zod schemas

Two new schemas in `src/domain/project/schemas.ts`:
- `reorderSceneInputSchema`
- `updateSceneInlineInputSchema`

#### New components (all in `src/components/outline/`)

- `scene-card.tsx` — draggable card showing title, status badge, truncated synopsis, drag handle icon
- `inline-scene-editor.tsx` — form inside card on focus: title input, status select, synopsis textarea
- `chapter-column.tsx` — vertical column: header + droppable scene list + "Add scene" button
- `outline-canvas.tsx` — horizontally scrollable flex container of all columns + DnD logic

#### New hook

- `src/hooks/use-outline-canvas.ts` — loads `WritingProject`, exposes optimistic state + callbacks for drop, inline edit (600ms debounce), create scene, add chapter

#### New page

- `src/app/workspace/[projectId]/outline/page.tsx` — client page at `/workspace/[projectId]/outline`

### Drag-and-drop approach

No new npm dependency. HTML5 Drag and Drop API via React synthetic events:

1. `dragstart` on `SceneCard` stores `{ sceneId, sourceChapterId, sourceIndex }` in a `useRef`.
2. `dragover` on `ChapterColumn` calls `event.preventDefault()` and updates `dropTarget` ref reading `data-index` attribute.
3. `drop` on `ChapterColumn` reads from refs, calls `handleDrop`.
4. `dragend` clears all refs and drop-highlight state.

---

## Implementation Steps

### Step 1 — Domain types and schemas

**Modify:** `src/domain/project/types.ts` — add `ReorderSceneInput`, `UpdateSceneInlineInput`

**Modify:** `src/domain/project/schemas.ts`

```ts
export const reorderSceneInputSchema = z.object({
  projectId: projectIdSchema,
  sceneId: sceneIdSchema,
  targetChapterId: chapterIdSchema,
  targetIndex: z.number().int().min(0),
});

export const updateSceneInlineInputSchema = z.object({
  projectId: projectIdSchema,
  sceneId: sceneIdSchema,
  title: sceneTitleSchema.optional(),
  status: sceneStatusSchema.optional(),
  synopsis: z.string().max(300).optional(),
});
```

### Step 2 — Repository interface

**Modify:** `src/domain/project/repository.ts`

```ts
reorderScene(input: ReorderSceneInput): Promise<void>;
updateSceneInline(input: UpdateSceneInlineInput): Promise<ProjectScene>;
```

### Step 3 — LocalProjectRepository implementation

**Modify:** `src/data/project/local-project-repository.ts`

**`reorderScene`:**
1. Validate with `reorderSceneInputSchema`.
2. Find source chapter containing `sceneId`.
3. Remove `sceneId` from source `sceneOrder`.
4. Insert at `targetIndex` in target chapter `sceneOrder` (clamped to length).
5. Rebuild with `withRecalculatedStats` and persist.

**`updateSceneInline`:**
1. Validate with `updateSceneInlineInputSchema`.
2. Find scene in `project.scenes`.
3. Merge patch fields, update `updatedAt`.
4. Rebuild with `withRecalculatedStats` and persist.
5. Return updated `ProjectScene`.

### Step 4 — ChapterService extension

**Modify:** `src/application/project/chapter-service.ts`

Add `reorderScene` and `updateSceneInline` as thin delegates to the repository.

### Step 5 — SceneCard component

**Create:** `src/components/outline/scene-card.tsx`

Renders `SceneStatusBadge`, scene title, truncated synopsis, drag handle (`GripVertical` from lucide-react). When `isEditingId === scene.id`, renders `InlineSceneEditor`. Has `data-index` attribute for DnD index detection.

### Step 6 — InlineSceneEditor component

**Create:** `src/components/outline/inline-scene-editor.tsx`

Controlled form: title input (max 120 chars), status `<select>`, synopsis `<textarea>` (max 300 chars). Fires `onInlineEdit` on `onChange`. Closes on blur with `relatedTarget` check. Has "Open" link to full scene editor.

### Step 7 — ChapterColumn component

**Create:** `src/components/outline/chapter-column.tsx`

Fixed min-width (`min-w-[220px]`), `overflow-y-auto`. Renders `<ol>` of `SceneCard` items. Empty drop zone at bottom (40px). Shows word count and scene count in header.

### Step 8 — OutlineCanvas component

**Create:** `src/components/outline/outline-canvas.tsx`

`<div className="flex gap-4 overflow-x-auto px-4 pb-4">` with one `ChapterColumn` per chapter. Handles loading/error/empty states. "Add Chapter" button with inline form.

### Step 9 — useOutlineCanvas hook

**Create:** `src/hooks/use-outline-canvas.ts`

```ts
type OutlineCanvasState = {
  project: WritingProject | null;
  loadState: 'loading' | 'ready' | 'error' | 'not-found';
  editingSceneId: string | null;
  dragState: { sceneId: string; sourceChapterId: string; sourceIndex: number } | null;
  dropTarget: { chapterId: string; index: number } | null;
  actionError: string | null;
};
```

- Loads project on mount via `ProjectService.getProjectById`
- `handleDrop`: optimistic reorder → `chapterService.reorderScene` → revert on error
- `handleInlineEdit`: 600ms debounce → `chapterService.updateSceneInline` (optimistic)
- `handleCreateScene`: `sceneEditorService.createScene` → reload
- `handleAddChapter`: `chapterService.createChapter` → reload

### Step 10 — Outline page

**Create:** `src/app/workspace/[projectId]/outline/page.tsx`

Client component. Uses `useParams`, instantiates `LocalProjectRepository`, creates services, calls `useOutlineCanvas`, renders `OutlineCanvas`.

### Step 11 — Navigation link

**Modify:** `src/app/workspace/[projectId]/page.tsx`

Add "Open Outline Canvas" link in `ProjectDetailView` header, consistent with existing "Open Story Bible" pattern.

---

## Files

### Create
- `src/components/outline/scene-card.tsx`
- `src/components/outline/inline-scene-editor.tsx`
- `src/components/outline/chapter-column.tsx`
- `src/components/outline/outline-canvas.tsx`
- `src/hooks/use-outline-canvas.ts`
- `src/app/workspace/[projectId]/outline/page.tsx`
- `src/test/project/outline-canvas.test.tsx`
- `src/test/project/use-outline-canvas.test.ts`
- `src/test/project/local-project-repository-reorder-inline.test.ts`

### Modify
- `src/domain/project/types.ts` — add `ReorderSceneInput`, `UpdateSceneInlineInput`
- `src/domain/project/schemas.ts` — add `reorderSceneInputSchema`, `updateSceneInlineInputSchema`
- `src/domain/project/repository.ts` — add interface methods
- `src/data/project/local-project-repository.ts` — implement both operations
- `src/application/project/chapter-service.ts` — extend service
- `src/app/workspace/[projectId]/page.tsx` — add outline link

---

## Testing

### Repository tests

```
describe('LocalProjectRepository reorderScene', () => {
  it('reorders a scene within the same chapter to a lower index')
  it('reorders a scene within the same chapter to a higher index')
  it('moves a scene from one chapter to another at a specific index')
  it('clamps targetIndex to the end when index exceeds scene count')
  it('is a no-op when scene is moved to its current position')
  it('throws SCENE_NOT_FOUND when sceneId does not exist')
  it('throws CHAPTER_NOT_FOUND when targetChapterId does not exist')
  it('recalculates chapter word counts after reorder')
})

describe('LocalProjectRepository updateSceneInline', () => {
  it('updates title only')
  it('updates status only')
  it('updates synopsis only')
  it('updates all three fields in one call')
  it('does not mutate beats or content')
  it('updates updatedAt timestamp')
  it('throws SCENE_NOT_FOUND for unknown sceneId')
})
```

### Hook tests

```
describe('useOutlineCanvas', () => {
  it('loads project on mount and sets loadState to ready')
  it('applies optimistic reorder immediately on handleDrop')
  it('reverts to previous state when reorderScene service call fails')
  it('debounces inline edit calls to updateSceneInline')
  it('calls createScene and reloads project on handleCreateScene')
  it('sets actionError when a service call throws')
})
```

### Component tests

```
describe('OutlineCanvas', () => {
  it('renders one ChapterColumn per chapter in chapterOrder')
  it('renders scene cards with title and status badge')
  it('shows empty state when project has no chapters')
  it('shows inline editor when a card is clicked')
  it('fires onInlineEdit callback when title is changed in inline editor')
  it('navigates to scene editor when Open link is clicked')
  it('shows actionError when prop is set')
})
```

---

## User Flows

### View the canvas
1. User on project detail page → clicks "Open Outline Canvas"
2. Navigates to `/workspace/[projectId]/outline`
3. Page renders all chapters as columns with scene cards

### Reorder a scene within a chapter
1. User hovers → sees drag handle
2. Drags card up/down → placeholder appears at insertion point
3. Drops → optimistic update + `reorderScene` call in background

### Move a scene to another chapter
1. Drags card to different column → target column highlights
2. Drops → optimistic update + `reorderScene` with new `targetChapterId`

### Edit a scene inline
1. Clicks card → `InlineSceneEditor` expands
2. Types new title → 600ms debounce → `updateSceneInline` called
3. Blurs → editor closes, card shows updated values

### Open full scene editor
1. Clicks "Open" link in inline editor → navigates to scene editor

---

## Dependencies

No new npm packages required. HTML5 DnD API via React synthetic events. `lucide-react` (already installed) provides `GripVertical` icon. `SceneStatusBadge` and `ChapterForm` are reused as-is.

Note: HTML5 DnD has poor touch support. Mobile users will see cards without drag. Touch support can be added later with `@dnd-kit/core` if needed.
