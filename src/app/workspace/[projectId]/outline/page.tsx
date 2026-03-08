'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { useMemo } from 'react';

import { createChapterService } from '@/application/project/chapter-service';
import { createProjectService } from '@/application/project/project-service';
import { SceneEditorService } from '@/application/scene/scene-editor-service';
import { OutlineCanvas } from '@/components/outline/outline-canvas';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { projectIdSchema } from '@/domain/project/schemas';
import { useOutlineCanvas } from '@/hooks/use-outline-canvas';

function useProjectIdParam(): string | null {
  const params = useParams<{ projectId: string }>();
  const projectIdParam = Array.isArray(params.projectId)
    ? (params.projectId[0] ?? '')
    : (params.projectId ?? '');
  const parsed = projectIdSchema.safeParse(projectIdParam);
  return parsed.success ? parsed.data : null;
}

function OutlinePageShell({ projectId }: { projectId: string }): ReactElement {
  const repository = useMemo(() => new LocalProjectRepository(), []);
  const projectService = useMemo(() => createProjectService(repository), [repository]);
  const chapterService = useMemo(() => createChapterService(repository), [repository]);
  const sceneService = useMemo(() => new SceneEditorService(repository), [repository]);

  const canvas = useOutlineCanvas({ projectId, projectService, chapterService, sceneService });

  if (canvas.loadState === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading outline…</p>
      </main>
    );
  }

  if (canvas.loadState === 'not-found') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Project not found.</p>
        <Link href="/workspace" className="text-sm text-primary underline">
          Back to workspace
        </Link>
      </main>
    );
  }

  if (canvas.loadState === 'error' || !canvas.project) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{canvas.actionError ?? 'Unable to load project.'}</p>
        <Link href="/workspace" className="text-sm text-primary underline">
          Back to workspace
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspace/${projectId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {canvas.project.title}
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <h1 className="text-sm font-semibold">Outline Canvas</h1>
        </div>
      </header>

      <div className="flex-1 py-6">
        <OutlineCanvas
          project={canvas.project}
          projectId={projectId}
          editingSceneId={canvas.editingSceneId}
          dropTarget={canvas.dropTarget}
          actionError={canvas.actionError}
          onEditStart={canvas.handleEditStart}
          onEditClose={canvas.handleEditClose}
          onInlineEdit={canvas.handleInlineEdit}
          onDragStart={canvas.handleDragStart}
          onDragEnd={canvas.handleDragEnd}
          onDragOver={canvas.handleDragOver}
          onDrop={canvas.handleDrop}
          onDragLeave={canvas.handleDragLeave}
          onKeyboardReorder={canvas.handleKeyboardReorder}
          onCreateScene={canvas.handleCreateScene}
          onAddChapter={canvas.handleAddChapter}
        />
      </div>
    </main>
  );
}

export default function OutlinePage(): ReactElement {
  const projectId = useProjectIdParam();

  if (!projectId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Invalid project identifier.</p>
        <Link href="/workspace" className="text-sm text-primary underline">
          Back to workspace
        </Link>
      </main>
    );
  }

  return <OutlinePageShell projectId={projectId} />;
}
