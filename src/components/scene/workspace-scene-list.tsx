'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { SceneEditorService } from '@/application/scene/scene-editor-service';
import { SceneStatusBadge } from '@/components/scene/scene-status-badge';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import type { SceneSummary } from '@/domain/scene/types';

type WorkspaceSceneListProps = {
  projectId: string;
};

type WorkspaceLoadState = 'loading' | 'ready' | 'project-not-found' | 'error';

type WorkspaceSceneState = {
  loadState: WorkspaceLoadState;
  scenes: SceneSummary[];
  errorMessage: string | null;
};

const initialWorkspaceSceneState: WorkspaceSceneState = {
  loadState: 'loading',
  scenes: [],
  errorMessage: null,
};

const createSceneEditorService = (): SceneEditorService => new SceneEditorService(new LocalProjectRepository());

const getLoadingView = (): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-8">
    <p className="text-muted-foreground">Loading workspace...</p>
  </main>
);

const getProjectNotFoundView = (projectId: string): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-8">
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

const getErrorView = (errorMessage: string | null): ReactElement => (
  <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-8">
    <div className="space-y-4 rounded-xl border bg-card p-6 text-card-foreground">
      <h1 className="text-2xl font-headline font-bold">Unable to load workspace</h1>
      <p className="text-muted-foreground">{errorMessage ?? 'Unexpected error.'}</p>
      <Link href="/" className="inline-flex rounded-md border px-3 py-2 text-sm font-medium">
        Back to home
      </Link>
    </div>
  </main>
);

const getLoadStateView = (props: {
  projectId: string;
  loadState: WorkspaceLoadState;
  errorMessage: string | null;
}): ReactElement | null => {
  if (props.loadState === 'loading') {
    return getLoadingView();
  }

  if (props.loadState === 'project-not-found') {
    return getProjectNotFoundView(props.projectId);
  }

  if (props.loadState === 'error') {
    return getErrorView(props.errorMessage);
  }

  return null;
};

function WorkspaceSceneItems(props: WorkspaceSceneListProps & { scenes: SceneSummary[] }): ReactElement {
  return (
    <ul className="space-y-3">
      {props.scenes.map((scene) => (
        <li key={scene.id} className="rounded-lg border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-headline font-semibold">{scene.title}</h2>
              <SceneStatusBadge status={scene.status} />
            </div>
            <Link
              href={`/workspace/${props.projectId}/scene/${scene.id}`}
              className="inline-flex rounded-md border px-3 py-2 text-sm font-medium"
            >
              Open scene
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

const loadWorkspaceScenes = async (props: {
  projectId: string;
  service: SceneEditorService;
  isDisposed: () => boolean;
  setState: (state: WorkspaceSceneState) => void;
}): Promise<void> => {
  props.setState({ loadState: 'loading', scenes: [], errorMessage: null });

  try {
    const result = await props.service.listProjectScenes({ projectId: props.projectId });
    if (props.isDisposed()) {
      return;
    }

    if (result.state === 'project-not-found') {
      props.setState({ loadState: 'project-not-found', scenes: [], errorMessage: null });
      return;
    }

    props.setState({ loadState: 'ready', scenes: result.scenes, errorMessage: null });
  } catch (error) {
    if (props.isDisposed()) {
      return;
    }

    props.setState({
      loadState: 'error',
      scenes: [],
      errorMessage: props.service.toUserErrorMessage(error),
    });
  }
};

const useWorkspaceSceneState = (props: {
  projectId: string;
  service: SceneEditorService;
}): WorkspaceSceneState => {
  const [state, setState] = useState<WorkspaceSceneState>(initialWorkspaceSceneState);

  useEffect(() => {
    let disposed = false;

    void loadWorkspaceScenes({
      projectId: props.projectId,
      service: props.service,
      isDisposed: () => disposed,
      setState,
    });

    return () => {
      disposed = true;
    };
  }, [props.projectId, props.service]);

  return state;
};

export function WorkspaceSceneList(props: WorkspaceSceneListProps): ReactElement {
  const service = useMemo(() => createSceneEditorService(), []);
  const state = useWorkspaceSceneState({
    projectId: props.projectId,
    service,
  });

  const stateView = getLoadStateView({
    projectId: props.projectId,
    loadState: state.loadState,
    errorMessage: state.errorMessage,
  });
  if (stateView) {
    return stateView;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-8">
      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <header className="mb-6 space-y-1">
          <h1 className="text-3xl font-headline font-bold">Workspace</h1>
          <p className="text-muted-foreground">
            Project <code>{props.projectId}</code>
          </p>
        </header>

        <WorkspaceSceneItems projectId={props.projectId} scenes={state.scenes} />

        {state.scenes.length === 0 ? (
          <p className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
            No scenes available for this project.
          </p>
        ) : null}
      </section>
    </main>
  );
}
