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
