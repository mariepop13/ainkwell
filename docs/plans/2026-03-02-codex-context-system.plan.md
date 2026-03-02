---
name: Codex Context System
overview: When a scene is open in the editor, automatically detect which story bible entities are mentioned in the content and surface their summaries — the context injection infrastructure for future AI assistance.
status: in-progress
pr: 13
todos:
  - id: 1
    content: "Build useCodexContext hook: scans scene content for entity name matches"
    status: done
    dependencies: []
  - id: 2
    content: "Build CodexContextPanel component to display matched entities"
    status: done
    dependencies: [1]
  - id: 3
    content: "Integrate panel into scene editor shell"
    status: done
    dependencies: [2]
---

# Codex Context System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** As a writer types in the scene editor, the app scans the content for story bible entity names and surfaces their summaries in a side panel — no manual linking required. Becomes the context injection layer when Claude API is added.

**Architecture:** New `useCodexContext` hook (debounced 800ms, reads from `BibleService`). New `CodexContextPanel` renders matched entities. No new storage. Integrates into scene editor shell as a collapsible right panel.

**Tech Stack:** Next.js 15, TypeScript, React, Tailwind CSS, existing `BibleService`

---

## Overview

Example: Writer types "Aria stepped into the Hollow Tower". The Codex panel shows:
- **Aria** (Character) — "The protagonist, a former archivist haunted by a lost manuscript"
- **Hollow Tower** (Location) — "An ancient lighthouse at the edge of the Dead Meridian"

### Matching Strategy

- Case-insensitive, whole-word matching (avoids "Ark" matching inside "darkness")
- Sorted by order of first mention in text
- Max 10 entities shown
- Debounced 800ms after last keystroke (same interval as autosave)

---

## Implementation Steps

### Task 1: useCodexContext hook

**Files:**
- Create: `src/hooks/use-codex-context.ts`
- Create: `src/test/hooks/use-codex-context.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCodexContext } from '@/hooks/use-codex-context';
import type { BibleService } from '@/application/bible/bible-service';
import type { BibleEntity } from '@/domain/bible/bible';

describe('useCodexContext', () => {
  const makeEntity = (name: string): BibleEntity => ({
    id: `e-${name}`, projectId: 'p1', category: 'character', name,
    summary: `Summary of ${name}`, details: '', tags: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  it('returns empty array when content is empty', async () => {
    const mockService = {
      listEntities: vi.fn().mockResolvedValue([makeEntity('Aria')]),
    } as unknown as BibleService;

    const { result } = renderHook(() =>
      useCodexContext({ projectId: 'p1', content: '', service: mockService }),
    );
    expect(result.current.matchedEntities).toEqual([]);
  });

  it('detects entity name mentions in content', async () => {
    vi.useFakeTimers();
    const aria = makeEntity('Aria');
    const marcus = makeEntity('Marcus');
    const mockService = {
      listEntities: vi.fn().mockResolvedValue([aria, marcus]),
    } as unknown as BibleService;

    const { result } = renderHook(() =>
      useCodexContext({ projectId: 'p1', content: 'Aria walked toward Marcus.', service: mockService }),
    );

    await act(async () => { vi.advanceTimersByTime(800); });

    expect(result.current.matchedEntities).toHaveLength(2);
    vi.useRealTimers();
  });

  it('is case-insensitive', async () => {
    vi.useFakeTimers();
    const aria = makeEntity('Aria');
    const mockService = {
      listEntities: vi.fn().mockResolvedValue([aria]),
    } as unknown as BibleService;

    const { result } = renderHook(() =>
      useCodexContext({ projectId: 'p1', content: 'ARIA entered the room.', service: mockService }),
    );

    await act(async () => { vi.advanceTimersByTime(800); });
    expect(result.current.matchedEntities).toHaveLength(1);
    vi.useRealTimers();
  });

  it('does not match substrings (whole-word only)', async () => {
    vi.useFakeTimers();
    const ark = makeEntity('Ark');
    const mockService = {
      listEntities: vi.fn().mockResolvedValue([ark]),
    } as unknown as BibleService;

    const { result } = renderHook(() =>
      useCodexContext({ projectId: 'p1', content: 'darkness fell', service: mockService }),
    );

    await act(async () => { vi.advanceTimersByTime(800); });
    expect(result.current.matchedEntities).toHaveLength(0);
    vi.useRealTimers();
  });
});
```

**Step 2: Run test — expect FAIL**
```bash
npx vitest run src/test/hooks/use-codex-context.test.ts
```

**Step 3: Implement the hook**

```ts
import { useEffect, useRef, useState } from 'react';
import type { BibleEntity } from '@/domain/bible/bible';
import type { BibleService } from '@/application/bible/bible-service';

const DEBOUNCE_MS = 800;
const MAX_MATCHES = 10;

type UseCodexContextInput = {
  projectId: string;
  content: string;
  service: BibleService;
};

type UseCodexContextResult = {
  matchedEntities: BibleEntity[];
};

export function useCodexContext({ projectId, content, service }: UseCodexContextInput): UseCodexContextResult {
  const [matchedEntities, setMatchedEntities] = useState<BibleEntity[]>([]);
  const allEntitiesRef = useRef<BibleEntity[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    service.listEntities(projectId).then((entities) => {
      allEntitiesRef.current = entities;
    });
  }, [projectId, service]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const matches = findMentionedEntities(content, allEntitiesRef.current);
      setMatchedEntities(matches.slice(0, MAX_MATCHES));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content]);

  return { matchedEntities };
}

function findMentionedEntities(content: string, entities: BibleEntity[]): BibleEntity[] {
  if (!content.trim()) return [];
  const mentioned: BibleEntity[] = [];
  const seenIds = new Set<string>();

  for (const entity of entities) {
    if (seenIds.has(entity.id)) continue;
    const pattern = new RegExp(`\\b${escapeRegex(entity.name)}\\b`, 'i');
    if (pattern.test(content)) {
      mentioned.push(entity);
      seenIds.add(entity.id);
    }
  }
  return mentioned;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**Step 4: Run test — expect PASS**
```bash
npx vitest run src/test/hooks/use-codex-context.test.ts
```

**Step 5: Commit**
```bash
git add src/hooks/use-codex-context.ts src/test/hooks/use-codex-context.test.ts
git commit -m "✨ feat: add useCodexContext hook for entity mention detection"
```

---

### Task 2: CodexContextPanel component

**Files:**
- Create: `src/components/scene/codex-context-panel.tsx`

**Step 1: Build the component**

```tsx
'use client';
import type { ReactElement } from 'react';
import { useState } from 'react';
import type { BibleEntity } from '@/domain/bible/bible';

const CATEGORY_LABELS: Record<BibleEntity['category'], string> = {
  character: 'Character', location: 'Location', faction: 'Faction', lore: 'Lore',
};

const CATEGORY_COLORS: Record<BibleEntity['category'], string> = {
  character: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  location: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  faction: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  lore: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

type Props = { entities: BibleEntity[] };

export function CodexContextPanel({ entities }: Props): ReactElement {
  const [isOpen, setIsOpen] = useState(true);

  if (entities.length === 0) return <></>;

  return (
    <div className="w-64 shrink-0 border-l border-border bg-card">
      <button
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-foreground"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <span>Codex ({entities.length})</span>
        <span className="text-muted-foreground">{isOpen ? '▶' : '◀'}</span>
      </button>
      {isOpen && (
        <div className="space-y-2 overflow-y-auto px-3 pb-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {entities.map((entity) => (
            <div className="rounded-md border border-border bg-background p-2" key={entity.id}>
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[entity.category]}`}>
                  {CATEGORY_LABELS[entity.category]}
                </span>
                <span className="text-sm font-medium text-foreground">{entity.name}</span>
              </div>
              {entity.summary && (
                <p className="text-xs text-muted-foreground line-clamp-3">{entity.summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add src/components/scene/codex-context-panel.tsx
git commit -m "✨ feat: add CodexContextPanel component"
```

---

### Task 3: Integrate into scene editor shell

**Files:**
- Modify: `src/components/scene/scene-editor-shell.tsx`

**Step 1: Read the file**
Read `src/components/scene/scene-editor-shell.tsx`.

**Step 2: Wire up the hook and panel**

Add imports at top:
```ts
import { useMemo } from 'react';
import { useCodexContext } from '@/hooks/use-codex-context';
import { CodexContextPanel } from './codex-context-panel';
import { BibleService } from '@/application/bible/bible-service';
import { LocalBibleRepository } from '@/data/bible/local-bible-repository';
```

Inside the component:
```ts
const bibleService = useMemo(() => new BibleService(new LocalBibleRepository()), []);
const { matchedEntities } = useCodexContext({
  projectId,
  content: viewState.content,
  service: bibleService,
});
```

Update the JSX layout to add the panel to the right of the textarea:
```tsx
<div className="flex flex-1 overflow-hidden">
  <textarea className="flex-1 resize-none ..." />
  <CodexContextPanel entities={matchedEntities} />
</div>
```

**Step 3: Run full test suite**
```bash
npm run test:ci
```

**Step 4: Commit**
```bash
git add src/components/scene/scene-editor-shell.tsx
git commit -m "✨ feat: integrate CodexContextPanel into scene editor shell"
```

---

## Files Summary

| Action | Path |
|--------|------|
| Create | `src/hooks/use-codex-context.ts` |
| Create | `src/components/scene/codex-context-panel.tsx` |
| Modify | `src/components/scene/scene-editor-shell.tsx` |
| Create | `src/test/hooks/use-codex-context.test.ts` |

---

## AI Readiness

When the AI Writing Assistant is added, `matchedEntities` becomes the context payload:

```ts
// Future usage:
const systemPrompt = [
  'You are a writing assistant. Here is the story context:',
  ...matchedEntities.map((e) => `- ${e.name} (${e.category}): ${e.summary}`),
].join('\n');
```

This is exactly how NovelCrafter injects Codex entries into its AI context window.
