import Link from 'next/link';
import type { ReactElement } from 'react';
import { useState } from 'react';

import type { ChapterSummary, WritingProject } from '@/domain/project/types';
import type { SceneStatus } from '@/domain/scene/types';
import { formatProjectDate } from '@/lib/utils';

import { ChapterForm } from './chapter-form';

type ChapterActions = {
  createScene: (chapterId: string, title: string) => Promise<void>;
  renameChapter: (chapterId: string, title: string) => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;
  reorderChapter: (chapterId: string, direction: 'up' | 'down') => Promise<void>;
  moveSceneToChapter: (sceneId: string, targetChapterId: string) => Promise<void>;
};

type ChapterOutlinePanelProps = {
  projectId: string;
  project: WritingProject;
  chapters: ChapterSummary[];
  actions: ChapterActions;
  actionError: string | null;
};

const statusLabel: Record<SceneStatus, string> = {
  draft: 'Draft',
  revise: 'Revise',
  final: 'Final',
};

type ChapterRowProps = {
  chapter: ChapterSummary;
  chapterIndex: number;
  project: WritingProject;
  projectId: string;
  isFirst: boolean;
  isLast: boolean;
  isOnlyChapter: boolean;
  chapters: ChapterSummary[];
  actions: ChapterActions;
};

function SceneRow({
  scene,
  chapterId,
  projectId,
  chapters,
  actions,
}: {
  scene: { id: string; title: string; status: SceneStatus; updatedAt: string; synopsis?: string };
  chapterId: string;
  projectId: string;
  chapters: ChapterSummary[];
  actions: ChapterActions;
}): ReactElement {
  return (
    <div className="flex items-center gap-3 py-1.5 pl-4 text-sm">
      <span className="flex flex-col flex-1 min-w-0">
        <span className="truncate text-muted-foreground">{scene.title}</span>
        {scene.synopsis ? (
          <span className="truncate text-xs text-muted-foreground/60">{scene.synopsis}</span>
        ) : null}
      </span>
      <span className="text-xs text-muted-foreground">{formatProjectDate(scene.updatedAt)}</span>
      <span className="text-xs text-muted-foreground">{statusLabel[scene.status]}</span>
      {chapters.length > 1 ? (
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Move to
          <select
            aria-label="Move to chapter"
            value=""
            onChange={(e) => {
              void actions.moveSceneToChapter(scene.id, e.target.value);
            }}
            className="border rounded px-1.5 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="" disabled>—</option>
            {chapters
              .filter((c) => c.id !== chapterId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>
        </label>
      ) : null}
      <Link
        href={`/workspace/${projectId}/scene/${scene.id}`}
        className="text-xs text-primary hover:underline whitespace-nowrap"
      >
        Open
      </Link>
    </div>
  );
}

function ChapterRow({
  chapter,
  chapterIndex,
  project,
  projectId,
  isFirst,
  isLast,
  isOnlyChapter,
  chapters,
  actions,
}: ChapterRowProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [nextSceneIndex, setNextSceneIndex] = useState(chapter.sceneCount + 1);

  const chapterData = project.chapters[chapter.id];
  const orderedScenes = chapterData
    ? chapterData.sceneOrder
        .map((sceneId) => project.scenes[sceneId])
        .filter((scene): scene is NonNullable<typeof scene> => Boolean(scene))
    : [];

  const handleRename = async (title: string): Promise<void> => {
    await actions.renameChapter(chapter.id, title);
    setIsRenaming(false);
  };

  const handleCreateScene = async (title: string): Promise<void> => {
    await actions.createScene(chapter.id, title);
    setNextSceneIndex((prev) => prev + 1);
    setIsAddingScene(false);
  };

  return (
    <li className="border-t py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
          {chapterIndex + 1}.
        </span>

        {isRenaming ? (
          <div className="flex-1">
            <ChapterForm
              initialTitle={chapter.title}
              submitLabel="Save"
              onSubmit={handleRename}
              onCancel={() => { setIsRenaming(false); }}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setIsExpanded((prev) => !prev); }}
            className="flex-1 text-left font-medium text-sm hover:text-primary transition-colors"
          >
            {chapter.title}
          </button>
        )}

        <span className="text-xs text-muted-foreground shrink-0">
          {chapter.sceneCount} sc · {chapter.wordCount.toLocaleString()} w
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => { void actions.reorderChapter(chapter.id, 'up'); }}
            disabled={isFirst}
            aria-label="Move chapter up"
            className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => { void actions.reorderChapter(chapter.id, 'down'); }}
            disabled={isLast}
            aria-label="Move chapter down"
            className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => { setIsRenaming(true); }}
            aria-label="Rename chapter"
            className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground text-xs"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={() => { void actions.deleteChapter(chapter.id); }}
            disabled={isOnlyChapter}
            aria-label="Delete chapter"
            className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30 text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-1 pl-5">
          {orderedScenes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">No scenes in this chapter.</p>
          ) : (
            <div>
              {orderedScenes.map((scene) => (
                <SceneRow
                  key={scene.id}
                  scene={scene}
                  chapterId={chapter.id}
                  projectId={projectId}
                  chapters={chapters}
                  actions={actions}
                />
              ))}
            </div>
          )}

          {isAddingScene ? (
            <div className="pt-2">
              <ChapterForm
                initialTitle={`Scene ${nextSceneIndex}`}
                submitLabel="Add"
                onSubmit={handleCreateScene}
                onCancel={() => { setIsAddingScene(false); }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setIsAddingScene(true); }}
              className="mt-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              + Add scene
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function ChapterOutlinePanel({
  projectId,
  project,
  chapters,
  actions,
  actionError,
}: ChapterOutlinePanelProps): ReactElement {
  return (
    <div>
      {actionError ? (
        <p className="text-destructive text-xs mb-3">{actionError}</p>
      ) : null}
      {chapters.length === 0 ? (
        <p className="text-sm text-muted-foreground italic pt-3 border-t">No chapters yet.</p>
      ) : (
        <ul className="pb-2">
          {chapters.map((chapter, index) => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              chapterIndex={index}
              project={project}
              projectId={projectId}
              isFirst={index === 0}
              isLast={index === chapters.length - 1}
              isOnlyChapter={chapters.length === 1}
              chapters={chapters}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
