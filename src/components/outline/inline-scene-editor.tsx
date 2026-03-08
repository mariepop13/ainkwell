import Link from 'next/link';
import type { FocusEvent, ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import type { ProjectScene } from '@/domain/project/types';
import type { SceneStatus } from '@/domain/scene/types';

type InlineSceneEditorPatch = {
  title?: string;
  status?: SceneStatus;
  synopsis?: string;
};

type InlineSceneEditorProps = {
  scene: ProjectScene;
  projectId: string;
  onInlineEdit: (patch: InlineSceneEditorPatch) => void;
  onClose: () => void;
};

const sceneStatusOptions: { value: SceneStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'revise', label: 'Revise' },
  { value: 'final', label: 'Final' },
];

export function InlineSceneEditor({
  scene,
  projectId,
  onInlineEdit,
  onClose,
}: InlineSceneEditorProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsidePointer = (event: PointerEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handleOutsidePointer, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer, true);
    };
  }, [onClose]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>): void => {
    const relatedTarget = event.relatedTarget as Node | null;
    if (containerRef.current && relatedTarget && containerRef.current.contains(relatedTarget)) {
      return;
    }
    onClose();
  };

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      className="flex flex-col gap-2 pt-2"
    >
      <input
        type="text"
        defaultValue={scene.title}
        maxLength={120}
        aria-label="Scene title"
        onChange={(e) => { onInlineEdit({ title: e.target.value }); }}
        className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <select
        defaultValue={scene.status}
        aria-label="Scene status"
        onChange={(e) => { onInlineEdit({ status: e.target.value as SceneStatus }); }}
        className="rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {sceneStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <textarea
        defaultValue={scene.synopsis ?? ''}
        maxLength={300}
        rows={3}
        aria-label="Scene synopsis"
        placeholder="Short synopsis…"
        onChange={(e) => { onInlineEdit({ synopsis: e.target.value }); }}
        className="w-full resize-none rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <Link
        href={`/workspace/${projectId}/scene/${scene.id}?from=outline`}
        className="self-start text-xs text-primary hover:underline"
      >
        Open full editor
      </Link>
    </div>
  );
}
