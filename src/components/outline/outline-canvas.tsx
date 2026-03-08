import type { ReactElement } from 'react';
import { useState } from 'react';

import type { WritingProject, ProjectScene } from '@/domain/project/types';
import { ChapterForm } from '@/components/workspace/chapter-form';

import type { DragInfo, InlineEditPatch } from '@/hooks/use-outline-canvas';
import { ChapterColumn } from './chapter-column';

type DropTarget = {
  chapterId: string;
  index: number;
};

type OutlineCanvasProps = {
  project: WritingProject;
  projectId: string;
  editingSceneId: string | null;
  dropTarget: DropTarget | null;
  actionError: string | null;
  onEditStart: (sceneId: string) => void;
  onEditClose: () => void;
  onInlineEdit: (sceneId: string, patch: InlineEditPatch) => void;
  onDragStart: (info: DragInfo) => void;
  onDragEnd: () => void;
  onDragOver: (chapterId: string, index: number) => void;
  onDrop: (targetChapterId: string, targetIndex: number) => void;
  onDragLeave: () => void;
  onCreateScene: (chapterId: string, title: string) => Promise<void>;
  onAddChapter: (title: string) => Promise<void>;
};

function getScenesForChapter(project: WritingProject, chapterId: string): ProjectScene[] {
  const chapter = project.chapters[chapterId];
  if (!chapter) {
    return [];
  }
  return chapter.sceneOrder
    .map((sceneId) => project.scenes[sceneId])
    .filter((scene): scene is ProjectScene => scene !== undefined);
}

function AddChapterControl({
  onAddChapter,
}: {
  onAddChapter: (title: string) => Promise<void>;
}): ReactElement {
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (title: string): Promise<void> => {
    await onAddChapter(title);
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <div className="min-w-[220px]">
        <ChapterForm
          submitLabel="Add"
          onSubmit={handleSubmit}
          onCancel={() => { setIsAdding(false); }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setIsAdding(true); }}
      className="min-w-[220px] rounded-lg border-2 border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors self-start"
    >
      + Add Chapter
    </button>
  );
}

export function OutlineCanvas({
  project,
  projectId,
  editingSceneId,
  dropTarget,
  actionError,
  onEditStart,
  onEditClose,
  onInlineEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDragLeave,
  onCreateScene,
  onAddChapter,
}: OutlineCanvasProps): ReactElement {
  if (project.chapterOrder.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground text-sm">No chapters yet. Add one to get started.</p>
        <AddChapterControl onAddChapter={onAddChapter} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {actionError ? (
        <p role="alert" className="text-destructive text-sm px-4">
          {actionError}
        </p>
      ) : null}
      <div className="flex gap-4 overflow-x-auto px-4 pb-4 items-start">
        {project.chapterOrder.map((chapterId) => {
          const chapter = project.chapters[chapterId];
          if (!chapter) {
            return null;
          }
          const scenes = getScenesForChapter(project, chapterId);
          const isDropTarget = dropTarget?.chapterId === chapterId;

          return (
            <ChapterColumn
              key={chapterId}
              chapter={chapter}
              projectId={projectId}
              scenes={scenes}
              editingSceneId={editingSceneId}
              isDropTarget={isDropTarget}
              onEditStart={onEditStart}
              onEditClose={onEditClose}
              onInlineEdit={onInlineEdit}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragLeave={onDragLeave}
              onCreateScene={onCreateScene}
            />
          );
        })}
        <AddChapterControl onAddChapter={onAddChapter} />
      </div>
    </div>
  );
}
