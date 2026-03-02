---
name: Scene Editor (Markdown)
overview: Add a full-featured scene editor with Markdown textarea, status workflow (draft/revise/final), 800ms autosave, word count, and navigation between scenes.
status: done
merged: "2026-02-27"
pr: 3
todos:
  - id: 1
    content: "Add Scene domain type and embed scenes in WritingProject"
    status: done
    dependencies: []
  - id: 2
    content: "Add scene CRUD to ProjectRepository interface"
    status: done
    dependencies: [1]
  - id: 3
    content: "Implement scene operations in LocalProjectRepository"
    status: done
    dependencies: [2]
  - id: 4
    content: "Build SceneEditorService with load, save, wordCount, navigation"
    status: done
    dependencies: [3]
  - id: 5
    content: "Build SceneEditorShell component with textarea and toolbar"
    status: done
    dependencies: [4]
  - id: 6
    content: "Build SceneToolbar with status selector, word count, save state"
    status: done
    dependencies: []
  - id: 7
    content: "Build SceneStatusBadge component"
    status: done
    dependencies: []
  - id: 8
    content: "Implement useSceneEditor hook with 800ms autosave debounce"
    status: done
    dependencies: [4]
  - id: 9
    content: "Isolate runtime refs in useSceneEditorRuntime"
    status: done
    dependencies: [8]
  - id: 10
    content: "Add /workspace/[projectId]/scene/[sceneId] page route"
    status: done
    dependencies: [5]
  - id: 11
    content: "Write tests for autosave and repository"
    status: done
    dependencies: [8]
---

# Scene Editor (Markdown) — Retroactive Plan

> This plan was written retroactively after the feature was merged (PR #3).

**Goal:** Writers open a scene and write in a full-page Markdown textarea. Content autosaves every 800ms after the last keystroke. They can toggle the scene's status (draft/revise/final) and navigate between previous/next scenes.

## Architecture

Scenes are embedded in `WritingProject.scenes: Record<string, Scene>` — no separate storage key. `SceneEditorService` is the application layer; `useSceneEditor` + `useSceneEditorRuntime` are the React hooks.

**Runtime refs isolation pattern:** mutable refs (debounce timer, content snapshot for dirty checking) live in `useSceneEditorRuntime` to prevent stale closures in the autosave callback. View state (content, status, wordCount, isDirty, isSaving, saveError, lastSavedAt) lives in `useSceneEditor`. This pattern was later reused for `useWritingSession`.

## Files Changed

| Action | Path |
|--------|------|
| Modify | `src/domain/project/project.ts` — add Scene type |
| Modify | `src/domain/project/project-repository.ts` — add scene methods |
| Modify | `src/data/project/local-project-repository.ts` — implement scene CRUD |
| Create | `src/application/scene/scene-editor-service.ts` |
| Create | `src/components/scene/scene-editor-shell.tsx` |
| Create | `src/components/scene/scene-toolbar.tsx` |
| Create | `src/components/scene/scene-status-badge.tsx` |
| Create | `src/hooks/use-scene-editor.ts` |
| Create | `src/hooks/use-scene-editor-runtime.ts` |
| Create | `src/app/workspace/[projectId]/scene/[sceneId]/page.tsx` |
| Modify | `src/app/workspace/[projectId]/page.tsx` |
| Modify | `src/app/globals.css` |
| Modify | `src/app/layout.tsx` |

## Key Decisions

- **800ms debounce** — long enough to not fire on every keystroke, short enough that writers never lose more than a second of work
- **`useSceneEditorRuntime` separation** — isolating mutable refs from view state prevents the autosave interval from capturing stale state references; critical for correctness
- **Scene max content: 1,000,000 characters** — enforced at the repository level to protect localStorage from extremely large payloads
- **Markdown-only** — no WYSIWYG to keep the editor simple and portable; preview toggle was left for a future feature
