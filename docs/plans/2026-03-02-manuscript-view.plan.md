---
name: manuscript-view
overview: |
  The Manuscript View provides a continuous, read-only scroll of an entire project's content
  — all chapters and scenes concatenated in their canonical order. Writers can "read their novel
  as a book" without switching between individual scene editors. Each chapter is introduced by
  a styled header; each scene is separated by a typographic divider and shows its title and full
  content. Per-chapter word counts and a grand total are displayed in a sticky summary bar. The
  view is purely derived from the existing WritingProject data structure: no new storage keys,
  no new domain entities, and no write path are needed.
todos:
  - id: 1
    content: "Add ManuscriptService to application layer with buildManuscript pure function"
    status: pending
    dependencies: []
  - id: 2
    content: "Add ManuscriptChapter and ManuscriptScene types to domain"
    status: pending
    dependencies: []
  - id: 3
    content: "Write unit tests for ManuscriptService (word counts, ordering, empty states)"
    status: pending
    dependencies: [1, 2]
  - id: 4
    content: "Build ManuscriptWordCountBar component (chapter totals + grand total)"
    status: pending
    dependencies: [2]
  - id: 5
    content: "Build ManuscriptChapterSection component (header + scene list)"
    status: pending
    dependencies: [2]
  - id: 6
    content: "Build ManuscriptPageContent component composing bar and chapter sections"
    status: pending
    dependencies: [4, 5]
  - id: 7
    content: "Create useManuscript hook that loads WritingProject and builds manuscript"
    status: pending
    dependencies: [1, 6]
  - id: 8
    content: "Create app route src/app/workspace/[projectId]/manuscript/page.tsx"
    status: pending
    dependencies: [7]
  - id: 9
    content: "Add Manuscript link to project detail page"
    status: pending
    dependencies: [8]
  - id: 10
    content: "Write component integration tests for ManuscriptPageContent"
    status: pending
    dependencies: [6, 7]
---

## Overview

Manuscript View assembles all chapters and scenes from a `WritingProject` into a single
continuous reading view accessible at `/workspace/[projectId]/manuscript`. The view is
deliberately read-only — writers read or proof their work here, not edit it. A floating
word count bar shows per-chapter word counts and the project grand total. A "Back to
workspace" link and individual "Edit scene" deep-links allow navigation back into the
editor. The feature adds no new localStorage keys and requires no changes to the data
layer; it is a pure projection of the already-loaded `WritingProject`.

---

## Architecture / Data Model

### What stays the same

- `WritingProject`, `ProjectChapter`, `ProjectScene` types are unchanged.
- `LocalProjectRepository` is read through the existing `ProjectService.getProjectById`.
- No new Zod schemas are needed in `domain/`.
- No changes to any existing page or repository.

### What is added

Two new read-only domain-level view types live in `src/domain/project/types.ts` as
type-only additions (no Zod schema needed — these are derived, never persisted):

```ts
export type ManuscriptScene = {
  id: string;
  title: string;
  content: string;
  wordCount: number;
};

export type ManuscriptChapter = {
  id: string;
  title: string;
  chapterIndex: number;
  scenes: ManuscriptScene[];
  wordCount: number;
};

export type Manuscript = {
  projectTitle: string;
  chapters: ManuscriptChapter[];
  totalWordCount: number;
};
```

A new `ManuscriptService` in `src/application/manuscript/manuscript-service.ts`
holds the pure `buildManuscript(project: WritingProject): Manuscript` function. This is
the only application-layer addition. The service takes a `WritingProject` (already loaded
in memory) and maps it to the `Manuscript` view type. Word counting reuses the same
split-on-whitespace strategy as `SceneEditorService.countWords`.

---

## Implementation Steps

### Step 1 — Domain view types

File to modify: `src/domain/project/types.ts`

Add `ManuscriptScene`, `ManuscriptChapter`, and `Manuscript` as plain TypeScript type
exports at the bottom of the file. These carry no Zod schemas since they are never stored.

### Step 2 — ManuscriptService

File to create: `src/application/manuscript/manuscript-service.ts`

```ts
import type { Manuscript, ManuscriptChapter, ManuscriptScene, WritingProject } from '@/domain/project/types';

function countWords(content: string): number {
  const trimmed = content.trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

function buildManuscriptScene(scene: { id: string; title: string; content: string }): ManuscriptScene {
  return {
    id: scene.id,
    title: scene.title,
    content: scene.content,
    wordCount: countWords(scene.content),
  };
}

function buildManuscriptChapter(
  chapterId: string,
  chapterIndex: number,
  project: WritingProject,
): ManuscriptChapter | null {
  const chapter = project.chapters[chapterId];
  if (!chapter) return null;

  const scenes = chapter.sceneOrder
    .map((sceneId) => project.scenes[sceneId])
    .filter((scene): scene is NonNullable<typeof scene> => Boolean(scene))
    .map(buildManuscriptScene);

  const wordCount = scenes.reduce((total, scene) => total + scene.wordCount, 0);

  return {
    id: chapterId,
    title: chapter.title,
    chapterIndex,
    scenes,
    wordCount,
  };
}

export function buildManuscript(project: WritingProject): Manuscript {
  const chapters = project.chapterOrder
    .map((chapterId, index) => buildManuscriptChapter(chapterId, index, project))
    .filter((chapter): chapter is ManuscriptChapter => chapter !== null);

  const totalWordCount = chapters.reduce((total, chapter) => total + chapter.wordCount, 0);

  return {
    projectTitle: project.title,
    chapters,
    totalWordCount,
  };
}
```

### Step 3 — ManuscriptWordCountBar component

File to create: `src/components/manuscript/manuscript-word-count-bar.tsx`

```tsx
'use client';
import { memo } from 'react';
import type { ReactElement } from 'react';
import type { Manuscript } from '@/domain/project/types';

type ManuscriptWordCountBarProps = {
  manuscript: Manuscript;
};

export const ManuscriptWordCountBar = memo(function ManuscriptWordCountBar(
  { manuscript }: ManuscriptWordCountBarProps,
): ReactElement {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-background/95 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
      {manuscript.chapters.map((chapter) => (
        <span key={chapter.id}>
          Ch. {chapter.chapterIndex + 1}: {chapter.wordCount.toLocaleString()} w
        </span>
      ))}
      <span className="ml-auto font-semibold text-foreground">
        Total: {manuscript.totalWordCount.toLocaleString()} words
      </span>
    </div>
  );
});
```

### Step 4 — ManuscriptSceneBlock component

File to create: `src/components/manuscript/manuscript-scene-block.tsx`

```tsx
import { memo } from 'react';
import type { ReactElement } from 'react';
import type { ManuscriptScene } from '@/domain/project/types';

type ManuscriptSceneBlockProps = {
  scene: ManuscriptScene;
  projectId: string;
};

export const ManuscriptSceneBlock = memo(function ManuscriptSceneBlock(
  { scene, projectId }: ManuscriptSceneBlockProps,
): ReactElement {
  return (
    <article className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold">{scene.title}</h3>
        <a
          href={`/workspace/${projectId}/scene/${scene.id}`}
          className="shrink-0 text-xs text-primary hover:underline"
        >
          Edit
        </a>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {scene.content.trim() || (
          <span className="italic text-muted-foreground">No content yet.</span>
        )}
      </div>
      <hr className="border-muted" />
    </article>
  );
});
```

### Step 5 — ManuscriptChapterSection component

File to create: `src/components/manuscript/manuscript-chapter-section.tsx`

```tsx
import type { ReactElement } from 'react';
import type { ManuscriptChapter } from '@/domain/project/types';
import { ManuscriptSceneBlock } from './manuscript-scene-block';

type ManuscriptChapterSectionProps = {
  chapter: ManuscriptChapter;
  projectId: string;
};

export function ManuscriptChapterSection(
  { chapter, projectId }: ManuscriptChapterSectionProps,
): ReactElement {
  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between border-b pb-2">
        <h2 className="text-2xl font-bold">
          {chapter.chapterIndex + 1}. {chapter.title}
        </h2>
        <span className="text-sm text-muted-foreground">
          {chapter.wordCount.toLocaleString()} words
        </span>
      </div>
      {chapter.scenes.length === 0 ? (
        <p className="italic text-sm text-muted-foreground">No scenes in this chapter.</p>
      ) : (
        <div className="space-y-8">
          {chapter.scenes.map((scene) => (
            <ManuscriptSceneBlock key={scene.id} scene={scene} projectId={projectId} />
          ))}
        </div>
      )}
    </section>
  );
}
```

### Step 6 — ManuscriptPageContent component

File to create: `src/components/manuscript/manuscript-page-content.tsx`

```tsx
'use client';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { ManuscriptWordCountBar } from './manuscript-word-count-bar';
import { ManuscriptChapterSection } from './manuscript-chapter-section';
import { useManuscript } from '@/hooks/use-manuscript';

type ManuscriptPageContentProps = {
  projectId: string;
};

export function ManuscriptPageContent({ projectId }: ManuscriptPageContentProps): ReactElement {
  const { loadState, manuscript } = useManuscript(projectId);

  if (loadState === 'loading') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
        <p className="text-muted-foreground">Loading manuscript...</p>
      </main>
    );
  }

  if (loadState === 'not-found') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="text-sm text-muted-foreground">This project does not exist in local storage.</p>
        <Link className="text-sm font-medium text-primary underline" href="/workspace">
          Back to workspace
        </Link>
      </main>
    );
  }

  if (loadState === 'error' || !manuscript) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-center gap-3 px-4">
        <h1 className="text-2xl font-semibold">Unable to load manuscript</h1>
        <Link className="text-sm font-medium text-primary underline" href={`/workspace/${projectId}`}>
          Back to project
        </Link>
      </main>
    );
  }

  return (
    <div>
      <ManuscriptWordCountBar manuscript={manuscript} />
      <main className="mx-auto w-full max-w-3xl space-y-12 px-4 py-10">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">{manuscript.projectTitle}</h1>
          <nav>
            <Link
              href={`/workspace/${projectId}`}
              className="text-sm font-medium text-primary underline"
            >
              Back to project
            </Link>
          </nav>
        </header>
        {manuscript.chapters.length === 0 ? (
          <p className="italic text-muted-foreground">No chapters yet.</p>
        ) : (
          manuscript.chapters.map((chapter) => (
            <ManuscriptChapterSection key={chapter.id} chapter={chapter} projectId={projectId} />
          ))
        )}
      </main>
    </div>
  );
}
```

### Step 7 — useManuscript hook

File to create: `src/hooks/use-manuscript.ts`

```ts
import { useEffect, useMemo, useState } from 'react';
import { createProjectService } from '@/application/project/project-service';
import { buildManuscript } from '@/application/manuscript/manuscript-service';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import type { Manuscript } from '@/domain/project/types';

type ManuscriptLoadState = 'loading' | 'ready' | 'not-found' | 'error';

type UseManuscriptResult = {
  loadState: ManuscriptLoadState;
  manuscript: Manuscript | null;
};

export function useManuscript(projectId: string): UseManuscriptResult {
  const repository = useMemo(() => new LocalProjectRepository(), []);
  const service = useMemo(() => createProjectService(repository), [repository]);
  const [loadState, setLoadState] = useState<ManuscriptLoadState>('loading');
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);

  useEffect(() => {
    let isMounted = true;

    void service.getProjectById(projectId).then((project) => {
      if (!isMounted) return;
      if (!project) { setLoadState('not-found'); return; }
      setManuscript(buildManuscript(project));
      setLoadState('ready');
    }).catch(() => {
      if (!isMounted) return;
      setLoadState('error');
    });

    return () => { isMounted = false; };
  }, [projectId, service]);

  return { loadState, manuscript };
}
```

### Step 8 — App route

File to create: `src/app/workspace/[projectId]/manuscript/page.tsx`

```tsx
import type { ReactElement } from 'react';
import { ManuscriptPageContent } from '@/components/manuscript/manuscript-page-content';

type ManuscriptPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ManuscriptPage(props: ManuscriptPageProps): Promise<ReactElement> {
  const { projectId } = await props.params;
  return <ManuscriptPageContent projectId={projectId} />;
}
```

### Step 9 — Link from project detail page

File to modify: `src/app/workspace/[projectId]/page.tsx`

Add a `ManuscriptSection` component and include it in `ProjectDetailView`:

```tsx
function ManuscriptSection({ projectId }: { projectId: string }): ReactElement {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-2xl font-semibold">Manuscript</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Read your entire novel as a continuous document.
      </p>
      <div className="mt-3">
        <Link
          className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          href={`/workspace/${projectId}/manuscript`}
        >
          Open Manuscript
        </Link>
      </div>
    </section>
  );
}
```

---

## Files

### Create

- `src/application/manuscript/manuscript-service.ts` — pure `buildManuscript` function
- `src/components/manuscript/manuscript-word-count-bar.tsx` — sticky word count summary bar
- `src/components/manuscript/manuscript-scene-block.tsx` — single scene renderer
- `src/components/manuscript/manuscript-chapter-section.tsx` — chapter header + scene list
- `src/components/manuscript/manuscript-page-content.tsx` — full page client component
- `src/hooks/use-manuscript.ts` — data loading hook
- `src/app/workspace/[projectId]/manuscript/page.tsx` — Next.js route page
- `src/test/manuscript/manuscript-service.test.ts` — unit tests for buildManuscript
- `src/test/manuscript/manuscript-page-content.test.tsx` — component integration tests

### Modify

- `src/domain/project/types.ts` — add `ManuscriptScene`, `ManuscriptChapter`, `Manuscript` types
- `src/app/workspace/[projectId]/page.tsx` — add `ManuscriptSection` + link

---

## Testing

### Unit tests: `src/test/manuscript/manuscript-service.test.ts`

```
describe('buildManuscript', () => {
  it('returns projectTitle from the project')
  it('orders chapters by chapterOrder')
  it('orders scenes by chapter sceneOrder')
  it('computes wordCount per scene from content')
  it('computes wordCount per chapter as sum of scene word counts')
  it('computes totalWordCount as sum of chapter word counts')
  it('returns empty chapters array when chapterOrder is empty')
  it('returns 0 totalWordCount when all scenes are empty')
  it('sets chapterIndex correctly starting at 0')
  it('skips missing chapter references gracefully')
  it('skips missing scene references within a chapter gracefully')
})
```

### Component integration tests: `src/test/manuscript/manuscript-page-content.test.tsx`

```
describe('ManuscriptPageContent', () => {
  it('shows loading state initially')
  it('renders project title after project loads')
  it('renders chapter headings in order')
  it('renders scene titles and content')
  it('renders total word count in the bar')
  it('renders Edit links for each scene pointing to scene editor')
  it('renders Back to project link')
  it('shows not-found message when projectId is invalid UUID')
  it('shows empty chapter message when chapter has no scenes')
})
```

---

## User Flows

1. Writer opens a project at `/workspace/[projectId]`.
2. Writer sees the "Manuscript" section with an "Open Manuscript" button.
3. Writer clicks and navigates to `/workspace/[projectId]/manuscript`.
4. Sticky bar shows "Ch. 1: 1,200 w   Ch. 2: 800 w   Total: 2,000 words".
5. Main area begins with the project title as `<h1>`.
6. Each chapter has a large `<h2>` heading with index, title, and word count.
7. Each scene: `<h3>` title, full content, horizontal divider, "Edit" link.
8. Writer scrolls through the whole novel.
9. Writer clicks "Edit" on a scene → navigates to scene editor.
10. Writer clicks "Back to project" → returns to project detail page.

---

## Dependencies

No new npm packages required. All utilities already present in the project.
