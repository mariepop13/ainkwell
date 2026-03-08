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
