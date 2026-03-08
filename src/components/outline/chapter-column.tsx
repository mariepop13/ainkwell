import type { DragEvent, ReactElement } from 'react';
import { useState } from 'react';

import type { ProjectChapter, ProjectScene } from '@/domain/project/types';
import type { SceneStatus } from '@/domain/scene/types';
import { ChapterForm } from '@/components/workspace/chapter-form';

import { SceneCard } from './scene-card';

type DragInfo = {
  sceneId: string;
  sourceChapterId: string;
  sourceIndex: number;
};

type InlineEditPatch = {
  title?: string;
  status?: SceneStatus;
  synopsis?: string;
};

type ChapterColumnProps = {
  chapter: ProjectChapter;
  projectId: string;
  scenes: ProjectScene[];
  editingSceneId: string | null;
  isDropTarget: boolean;
  onEditStart: (sceneId: string) => void;
  onEditClose: () => void;
  onInlineEdit: (sceneId: string, patch: InlineEditPatch) => void;
  onDragStart: (info: DragInfo) => void;
  onDragEnd: () => void;
  onDragOver: (chapterId: string, index: number) => void;
  onDrop: (targetChapterId: string, targetIndex: number) => void;
  onDragLeave: () => void;
  onCreateScene: (chapterId: string, title: string) => Promise<void>;
};

function resolveDropIndex(event: DragEvent<HTMLElement>, sceneCount: number): number {
  const target = event.target as HTMLElement;
  const card = target.closest<HTMLElement>('[data-index]');
  if (card?.dataset.index !== undefined) {
    return parseInt(card.dataset.index, 10);
  }
  return sceneCount;
}

export function ChapterColumn({
  chapter,
  projectId,
  scenes,
  editingSceneId,
  isDropTarget,
  onEditStart,
  onEditClose,
  onInlineEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDragLeave,
  onCreateScene,
}: ChapterColumnProps): ReactElement {
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [nextSceneIndex, setNextSceneIndex] = useState(scenes.length + 1);

  const handleDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const dropIndex = resolveDropIndex(event, scenes.length);
    onDragOver(chapter.id, dropIndex);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const dropIndex = resolveDropIndex(event, scenes.length);
    onDrop(chapter.id, dropIndex);
  };

  const handleCreateScene = async (title: string): Promise<void> => {
    await onCreateScene(chapter.id, title);
    setNextSceneIndex((prev) => prev + 1);
    setIsAddingScene(false);
  };

  return (
    <div
      className={`flex flex-col min-w-[220px] max-w-[280px] rounded-lg border bg-muted/30 transition-colors ${isDropTarget ? 'border-primary/60 bg-primary/5' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={onDragLeave}
    >
      <header className="px-3 pt-3 pb-2 border-b">
        <h3 className="text-sm font-semibold truncate">{chapter.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {scenes.length} {scenes.length === 1 ? 'scene' : 'scenes'} · {chapter.wordCount.toLocaleString()} w
        </p>
      </header>

      <ol className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
        {scenes.map((scene, index) => (
          <li key={scene.id}>
            <SceneCard
              scene={scene}
              index={index}
              chapterId={chapter.id}
              projectId={projectId}
              isEditing={editingSceneId === scene.id}
              onEditStart={onEditStart}
              onEditClose={onEditClose}
              onInlineEdit={onInlineEdit}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </li>
        ))}

        {scenes.length === 0 ? (
          <li className="h-10 rounded border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-xs text-muted-foreground/50">
            Drop scenes here
          </li>
        ) : null}
      </ol>

      <div className="px-3 pb-3">
        {isAddingScene ? (
          <ChapterForm
            initialTitle={`Scene ${nextSceneIndex}`}
            submitLabel="Add"
            onSubmit={handleCreateScene}
            onCancel={() => { setIsAddingScene(false); }}
          />
        ) : (
          <button
            type="button"
            onClick={() => { setIsAddingScene(true); }}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            + Add scene
          </button>
        )}
      </div>
    </div>
  );
}
