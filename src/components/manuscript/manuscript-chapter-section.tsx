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
