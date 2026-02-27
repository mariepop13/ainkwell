'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useMemo } from 'react';

import {
  SceneEditorService,
  type SceneEditorServicePort,
} from '@/application/scene/scene-editor-service';
import { SceneToolbar } from '@/components/scene/scene-toolbar';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { useSceneEditor, type UseSceneEditorResult } from '@/hooks/use-scene-editor';

type SceneEditorShellProps = {
  projectId: string;
  sceneId: string;
  service?: SceneEditorServicePort;
};

const createSceneEditorService = (): SceneEditorServicePort =>
  new SceneEditorService(new LocalProjectRepository());

type SceneStateViewProps = {
  projectId: string;
  sceneId: string;
  loadState: UseSceneEditorResult['loadState'];
  saveError: string | null;
};

const getLoadingSceneView = (): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8">
    <p className="text-muted-foreground">Loading scene...</p>
  </main>
);

const getProjectNotFoundView = (projectId: string): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8">
    <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground">
      <h1 className="text-2xl font-headline font-bold">Project not found</h1>
      <p className="text-muted-foreground">
        The project <code>{projectId}</code> does not exist.
      </p>
      <Link href="/" className="inline-flex rounded-md border px-3 py-2 text-sm font-medium">
        Back to home
      </Link>
    </div>
  </main>
);

const getSceneNotFoundView = (props: Pick<SceneStateViewProps, 'projectId' | 'sceneId'>): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8">
    <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground">
      <h1 className="text-2xl font-headline font-bold">Scene not found</h1>
      <p className="text-muted-foreground">
        The scene <code>{props.sceneId}</code> was not found in this project.
      </p>
      <Link
        href={`/workspace/${props.projectId}`}
        className="inline-flex rounded-md border px-3 py-2 text-sm font-medium"
      >
        Back to workspace
      </Link>
    </div>
  </main>
);

const getSceneLoadErrorView = (
  props: Pick<SceneStateViewProps, 'projectId' | 'saveError'>,
): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8">
    <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground">
      <h1 className="text-2xl font-headline font-bold">Unable to load scene</h1>
      <p className="text-muted-foreground">{props.saveError ?? 'An unexpected error occurred.'}</p>
      <Link
        href={`/workspace/${props.projectId}`}
        className="inline-flex rounded-md border px-3 py-2 text-sm font-medium"
      >
        Back to workspace
      </Link>
    </div>
  </main>
);

const getSceneStateView = (props: SceneStateViewProps): ReactElement | null => {
  if (props.loadState === 'loading') {
    return getLoadingSceneView();
  }

  if (props.loadState === 'project-not-found') {
    return getProjectNotFoundView(props.projectId);
  }

  if (props.loadState === 'scene-not-found') {
    return getSceneNotFoundView(props);
  }

  if (props.loadState === 'error') {
    return getSceneLoadErrorView(props);
  }

  return null;
};

type SceneEditorNavigationProps = {
  projectId: string;
  previousSceneId: string | null;
  nextSceneId: string | null;
};

function SceneEditorNavigation(props: SceneEditorNavigationProps): ReactElement {
  return (
    <nav className="flex items-center justify-between">
      {props.previousSceneId ? (
        <Link
          href={`/workspace/${props.projectId}/scene/${props.previousSceneId}`}
          className="inline-flex rounded-md border px-3 py-2 text-sm font-medium"
        >
          Previous
        </Link>
      ) : (
        <button type="button" disabled className="inline-flex rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Previous
        </button>
      )}

      <Link href={`/workspace/${props.projectId}`} className="inline-flex rounded-md border px-3 py-2 text-sm font-medium">
        Back to workspace
      </Link>

      {props.nextSceneId ? (
        <Link
          href={`/workspace/${props.projectId}/scene/${props.nextSceneId}`}
          className="inline-flex rounded-md border px-3 py-2 text-sm font-medium"
        >
          Next
        </Link>
      ) : (
        <button type="button" disabled className="inline-flex rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Next
        </button>
      )}
    </nav>
  );
}

type SceneEditorLoadedViewProps = {
  projectId: string;
  sceneEditor: UseSceneEditorResult;
};

function SceneEditorLoadedView(props: SceneEditorLoadedViewProps): ReactElement {
  if (!props.sceneEditor.scene) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-8">
        <p className="text-muted-foreground">Scene not found</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-8">
      <SceneToolbar
        title={props.sceneEditor.scene.title}
        status={props.sceneEditor.status}
        wordCount={props.sceneEditor.wordCount}
        isDirty={props.sceneEditor.isDirty}
        isSaving={props.sceneEditor.isSaving}
        lastSavedAt={props.sceneEditor.lastSavedAt}
        saveError={props.sceneEditor.saveError}
        onStatusChange={props.sceneEditor.setStatus}
        onRetrySave={props.sceneEditor.retrySave}
      />

      <section className="flex-1 rounded-xl border bg-card p-4 text-card-foreground">
        <label htmlFor="scene-content" className="mb-2 block text-sm font-medium">
          Markdown content
        </label>
        <textarea
          id="scene-content"
          value={props.sceneEditor.content}
          onChange={(event) => props.sceneEditor.setContent(event.target.value)}
          className="min-h-[60vh] w-full resize-y rounded-md border bg-background p-3 font-mono text-sm"
        />
      </section>

      <SceneEditorNavigation
        projectId={props.projectId}
        previousSceneId={props.sceneEditor.previousSceneId}
        nextSceneId={props.sceneEditor.nextSceneId}
      />
    </main>
  );
}

export function SceneEditorShell(props: SceneEditorShellProps): ReactElement {
  const service = useMemo<SceneEditorServicePort>(
    () => props.service ?? createSceneEditorService(),
    [props.service],
  );

  const sceneEditor = useSceneEditor({ projectId: props.projectId, sceneId: props.sceneId, service });
  const stateView = getSceneStateView({
    projectId: props.projectId,
    sceneId: props.sceneId,
    loadState: sceneEditor.loadState,
    saveError: sceneEditor.saveError,
  });

  if (stateView) {
    return stateView;
  }

  return <SceneEditorLoadedView projectId={props.projectId} sceneEditor={sceneEditor} />;
}
