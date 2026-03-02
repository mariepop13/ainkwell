---
name: Scene Beat Planner
overview: Add a synopsis field and beat cards per scene so writers can plan scenes before writing them — the structured data foundation for future AI assistance.
status: done
merged: "2026-03-02"
pr: 12
todos:
  - id: 1
    content: "Extend Scene domain type with synopsis and beats fields"
    status: done
    dependencies: []
  - id: 2
    content: "Update LocalProjectRepository to persist synopsis/beats"
    status: done
    dependencies: [1]
  - id: 3
    content: "Update SceneEditorService to pass through synopsis/beats"
    status: done
    dependencies: [2]
  - id: 4
    content: "Build SceneBeatPanel component for scene editor"
    status: done
    dependencies: [3]
  - id: 5
    content: "Add inline synopsis to chapter outline panel"
    status: done
    dependencies: [3]
---

# Scene Beat Planner — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Each scene gets a `synopsis` (short sentence: what happens) and `beats` (ordered list of story beats: setup, conflict, resolution, etc.). Writers plan before they write. AI will fill these fields in a future feature.

**Architecture:** Extend `Scene` domain type. Repository persists new fields transparently (optional fields, backward compatible). `SceneEditorService` passes them through. New `SceneBeatPanel` in scene editor. Inline synopsis in chapter outline.

**Tech Stack:** Next.js 15, TypeScript, Zod, React, Tailwind CSS

---

## Architecture / Data Model

```ts
export type BeatType = 'setup' | 'conflict' | 'resolution' | 'action' | 'dialogue' | 'revelation';

export type SceneBeat = {
  id: string;
  content: string;    // max 200 chars
  type: BeatType;
};

// Extend existing Scene:
export type Scene = {
  // ... existing fields unchanged
  synopsis?: string;    // max 300 chars
  beats?: SceneBeat[];  // max 20 beats
};
```

No new storage keys. `synopsis` and `beats` stored inside the existing `WritingProject` in `ainkwell.projects.v1`. Backward compatible — existing scenes without these fields work fine.

---

## Implementation Steps

### Task 1: Extend Scene domain type

**Files:**
- Modify: `src/domain/project/project.ts`

**Step 1: Read the file**
Read `src/domain/project/project.ts` to find the Scene type and its Zod schema.

**Step 2: Write the failing test**

File: `src/test/scene/scene-beat.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { sceneBeatSchema, sceneSchema } from '@/domain/project/project';

describe('Scene beat schema', () => {
  it('validates a beat with valid type', () => {
    const beat = { id: 'b1', content: 'Hero enters the room', type: 'setup' };
    expect(() => sceneBeatSchema.parse(beat)).not.toThrow();
  });

  it('rejects beat with invalid type', () => {
    const beat = { id: 'b1', content: 'Hero enters the room', type: 'invalid' };
    expect(() => sceneBeatSchema.parse(beat)).toThrow();
  });

  it('accepts scene without synopsis or beats (backward compat)', () => {
    const scene = {
      id: 's1', projectId: 'p1', title: 'Opening Scene',
      content: '', status: 'draft', updatedAt: new Date().toISOString(),
    };
    expect(() => sceneSchema.parse(scene)).not.toThrow();
  });

  it('accepts scene with synopsis and beats', () => {
    const scene = {
      id: 's1', projectId: 'p1', title: 'Opening Scene',
      content: '', status: 'draft', updatedAt: new Date().toISOString(),
      synopsis: 'Aria discovers the letter is missing.',
      beats: [
        { id: 'b1', content: 'Aria opens the drawer', type: 'setup' },
        { id: 'b2', content: 'Aria realizes the letter is gone', type: 'revelation' },
      ],
    };
    expect(() => sceneSchema.parse(scene)).not.toThrow();
  });
});
```

**Step 3: Run test — expect FAIL** (`sceneBeatSchema` doesn't exist yet)
```bash
npx vitest run src/test/scene/scene-beat.test.ts
```

**Step 4: Add types and schemas**

In `src/domain/project/project.ts`, add:
```ts
export const beatTypeSchema = z.enum([
  'setup', 'conflict', 'resolution', 'action', 'dialogue', 'revelation',
]);
export type BeatType = z.infer<typeof beatTypeSchema>;

export const sceneBeatSchema = z.object({
  id: z.string(),
  content: z.string().max(200),
  type: beatTypeSchema,
});
export type SceneBeat = z.infer<typeof sceneBeatSchema>;
```

Then extend the existing `sceneSchema` with:
```ts
synopsis: z.string().max(300).optional(),
beats: z.array(sceneBeatSchema).max(20).optional(),
```

**Step 5: Run test — expect PASS**
```bash
npx vitest run src/test/scene/scene-beat.test.ts
```

**Step 6: Commit**
```bash
git add src/domain/project/project.ts src/test/scene/scene-beat.test.ts
git commit -m "✨ feat: add SceneBeat type and synopsis/beats fields to Scene domain schema"
```

---

### Task 2: Update repository and service

**Files:**
- Modify: `src/domain/project/project-repository.ts`
- Modify: `src/data/project/local-project-repository.ts`
- Modify: `src/application/scene/scene-editor-service.ts`

**Step 1: Read the files**
Read `src/domain/project/project-repository.ts` and `src/application/scene/scene-editor-service.ts`.

**Step 2: Update SaveSceneInput in project-repository.ts**
```ts
export type SaveSceneInput = {
  // ... existing fields
  synopsis?: string;
  beats?: SceneBeat[];
};
```

**Step 3: Update saveScene in LocalProjectRepository**
When writing the scene object, include:
```ts
const updatedScene: Scene = {
  ...existingScene,
  content: input.content,
  status: input.status,
  updatedAt: input.updatedAt,
  synopsis: input.synopsis,
  beats: input.beats,
};
```

**Step 4: Update SceneEditorService.saveScene signature**
Add `synopsis?: string` and `beats?: SceneBeat[]` to the input type and forward them to the repository.

**Step 5: Run full tests**
```bash
npm run test:ci
```

**Step 6: Commit**
```bash
git add src/domain/project/project-repository.ts src/data/project/local-project-repository.ts src/application/scene/scene-editor-service.ts
git commit -m "✨ feat: persist synopsis and beats through repository and service layers"
```

---

### Task 3: SceneBeatPanel component + scene editor integration

**Files:**
- Create: `src/components/scene/scene-beat-panel.tsx`
- Modify: `src/components/scene/scene-editor-shell.tsx`

**Step 1: Read scene-editor-shell.tsx**
Read `src/components/scene/scene-editor-shell.tsx`.

**Step 2: Build SceneBeatPanel**

```tsx
'use client';
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { SceneBeat, BeatType } from '@/domain/project/project';

type Props = {
  synopsis: string;
  beats: SceneBeat[];
  onSynopsisChange: (value: string) => void;
  onBeatsChange: (beats: SceneBeat[]) => void;
};

const BEAT_LABELS: Record<BeatType, string> = {
  setup: 'Setup', conflict: 'Conflict', resolution: 'Resolution',
  action: 'Action', dialogue: 'Dialogue', revelation: 'Revelation',
};

export function SceneBeatPanel({ synopsis, beats, onSynopsisChange, onBeatsChange }: Props): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  function addBeat(): void {
    onBeatsChange([...beats, { id: crypto.randomUUID(), content: '', type: 'setup' }]);
  }

  function updateBeat(id: string, changes: Partial<SceneBeat>): void {
    onBeatsChange(beats.map((b) => (b.id === id ? { ...b, ...changes } : b)));
  }

  function removeBeat(id: string): void {
    onBeatsChange(beats.filter((b) => b.id !== id));
  }

  return (
    <div className="border-b border-border bg-card">
      <button
        className="flex w-full items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <span>Scene Plan</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="space-y-3 px-4 pb-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Synopsis</label>
            <input
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              maxLength={300}
              onChange={(e) => onSynopsisChange(e.target.value)}
              placeholder="What happens in this scene?"
              type="text"
              value={synopsis}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Beats</label>
              <button className="text-xs text-primary hover:underline" onClick={addBeat} type="button">
                + Add beat
              </button>
            </div>
            <ol className="space-y-2">
              {beats.map((beat) => (
                <li className="flex items-start gap-2" key={beat.id}>
                  <select
                    className="rounded border border-border bg-background px-1 py-1 text-xs"
                    onChange={(e) => updateBeat(beat.id, { type: e.target.value as BeatType })}
                    value={beat.type}
                  >
                    {Object.entries(BEAT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <input
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    maxLength={200}
                    onChange={(e) => updateBeat(beat.id, { content: e.target.value })}
                    placeholder="Describe this beat…"
                    type="text"
                    value={beat.content}
                  />
                  <button
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => removeBeat(beat.id)}
                    type="button"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Integrate in scene-editor-shell.tsx**
Add `<SceneBeatPanel>` between the toolbar and textarea. Wire synopsis and beats from scene state; save with same debounce as content (800ms).

**Step 4: Run tests**
```bash
npm run test:ci
```

**Step 5: Commit**
```bash
git add src/components/scene/scene-beat-panel.tsx src/components/scene/scene-editor-shell.tsx
git commit -m "✨ feat: add SceneBeatPanel to scene editor"
```

---

### Task 4: Inline synopsis in chapter outline

**Files:**
- Modify: `src/components/workspace/chapter-outline-panel.tsx`

**Step 1: Read the file**

**Step 2: Show synopsis below scene title if present**
```tsx
<div className="flex flex-col">
  <span className="text-sm">{scene.title}</span>
  {scene.synopsis && (
    <span className="text-xs text-muted-foreground line-clamp-1">{scene.synopsis}</span>
  )}
</div>
```

**Step 3: Run tests**
```bash
npm run test:ci
```

**Step 4: Commit**
```bash
git add src/components/workspace/chapter-outline-panel.tsx
git commit -m "✨ feat: show scene synopsis inline in chapter outline"
```

---

## Files Summary

| Action | Path |
|--------|------|
| Modify | `src/domain/project/project.ts` |
| Modify | `src/domain/project/project-repository.ts` |
| Modify | `src/data/project/local-project-repository.ts` |
| Modify | `src/application/scene/scene-editor-service.ts` |
| Create | `src/components/scene/scene-beat-panel.tsx` |
| Modify | `src/components/scene/scene-editor-shell.tsx` |
| Modify | `src/components/workspace/chapter-outline-panel.tsx` |
| Create | `src/test/scene/scene-beat.test.ts` |

---

## AI Readiness

- `synopsis` = AI instruction: "write a scene that does X"
- `beats` = AI outline: "write a scene with these micro-moments in order"
- Future AI Writing Assistant will read these as prompts to generate scene content
