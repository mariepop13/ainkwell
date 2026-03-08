import type { DragEvent, ReactElement } from 'react';
import { GripVertical } from 'lucide-react';

import type { ProjectScene } from '@/domain/project/types';
import type { SceneStatus } from '@/domain/scene/types';
import { SceneStatusBadge } from '@/components/scene/scene-status-badge';

import { InlineSceneEditor } from './inline-scene-editor';

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

type SceneCardProps = {
  scene: ProjectScene;
  index: number;
  chapterId: string;
  projectId: string;
  isEditing: boolean;
  onEditStart: (sceneId: string) => void;
  onEditClose: () => void;
  onInlineEdit: (sceneId: string, patch: InlineEditPatch) => void;
  onDragStart: (info: DragInfo) => void;
  onDragEnd: () => void;
};

const SYNOPSIS_MAX_DISPLAY_LENGTH = 80;

function truncateSynopsis(synopsis: string): string {
  if (synopsis.length <= SYNOPSIS_MAX_DISPLAY_LENGTH) {
    return synopsis;
  }
  return `${synopsis.slice(0, SYNOPSIS_MAX_DISPLAY_LENGTH)}…`;
}

export function SceneCard({
  scene,
  index,
  chapterId,
  projectId,
  isEditing,
  onEditStart,
  onEditClose,
  onInlineEdit,
  onDragStart,
  onDragEnd,
}: SceneCardProps): ReactElement {
  const handleDragStart = (event: DragEvent<HTMLDivElement>): void => {
    event.dataTransfer.effectAllowed = 'move';
    onDragStart({ sceneId: scene.id, sourceChapterId: chapterId, sourceIndex: index });
  };

  return (
    <div
      draggable
      data-index={index}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={() => { if (!isEditing) { onEditStart(scene.id); } }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' && !isEditing) { onEditStart(scene.id); } }}
      aria-label={`Scene: ${scene.title}`}
      className="rounded-md border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start gap-2">
        <GripVertical
          size={14}
          className="mt-0.5 shrink-0 text-muted-foreground/50"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SceneStatusBadge status={scene.status} />
            <span className="text-sm font-medium truncate">{scene.title}</span>
          </div>
          {scene.synopsis && !isEditing ? (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {truncateSynopsis(scene.synopsis)}
            </p>
          ) : null}
          {isEditing ? (
            <InlineSceneEditor
              scene={scene}
              projectId={projectId}
              onInlineEdit={(patch) => { onInlineEdit(scene.id, patch); }}
              onClose={onEditClose}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
