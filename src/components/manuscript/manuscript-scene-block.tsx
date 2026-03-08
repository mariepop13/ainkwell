import Link from 'next/link';
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
        <Link
          href={`/workspace/${projectId}/scene/${scene.id}`}
          className="shrink-0 text-xs text-primary hover:underline"
        >
          Edit
        </Link>
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
