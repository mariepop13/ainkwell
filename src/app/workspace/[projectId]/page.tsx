'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { createProjectService } from '@/application/project/project-service';
import type { ProjectService } from '@/application/project/project-service';
import { SceneEditorService } from '@/application/scene/scene-editor-service';
import { SceneStatusBadge } from '@/components/scene/scene-status-badge';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { projectIdSchema } from '@/domain/project/schemas';
import type { WritingProject } from '@/domain/project/types';
import { formatProjectDate } from '@/lib/utils';

type DetailState = 'loading' | 'not-found' | 'ready' | 'error';

type ProjectDetailResult = {
  state: DetailState;
  errorMessage: string | null;
  project: WritingProject | null;
  reload: () => Promise<void>;
};

type SceneActions = {
  isCreatingScene: boolean;
  sceneActionError: string | null;
  createScene: () => Promise<void>;
};

type ProjectLoadHandlers = {
  start: () => void;
  applyReady: (project: WritingProject) => void;
  applyNotFound: () => void;
  applyError: (error: unknown) => void;
  shouldApply: () => boolean;
};

const getProjectIdParam = (input: string | string[] | undefined): string => {
  if (Array.isArray(input)) {
    return input[0] ?? '';
  }

  return input ?? '';
};

const toErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
};

const getNextSceneTitle = (project: WritingProject): string => `Scene ${project.sceneOrder.length + 1}`;

const loadProjectDetail = async (
  projectId: string,
  service: ProjectService,
  handlers: ProjectLoadHandlers,
): Promise<void> => {
  handlers.start();

  try {
    const loadedProject = await service.getProjectById(projectId);
    if (!handlers.shouldApply()) {
      return;
    }

    if (!loadedProject) {
      handlers.applyNotFound();
      return;
    }

    handlers.applyReady(loadedProject);
  } catch (error) {
    if (!handlers.shouldApply()) {
      return;
    }

    handlers.applyError(error);
  }
};

const useProjectIdParam = (): string | null => {
  const params = useParams<{ projectId: string }>();
  const projectIdParam = getProjectIdParam(params.projectId);
  const parsedProjectId = projectIdSchema.safeParse(projectIdParam);
  return parsedProjectId.success ? parsedProjectId.data : null;
};

const useProjectLoadHandlers = (
  setState: Dispatch<SetStateAction<DetailState>>,
  setErrorMessage: Dispatch<SetStateAction<string | null>>,
  setProject: Dispatch<SetStateAction<WritingProject | null>>,
): Omit<ProjectLoadHandlers, 'shouldApply'> => {
  const start = useCallback((): void => {
    setState('loading');
    setErrorMessage(null);
  }, [setErrorMessage, setState]);
  const applyReady = useCallback((loadedProject: WritingProject): void => {
    setProject(loadedProject);
    setState('ready');
  }, [setProject, setState]);
  const applyNotFound = useCallback((): void => {
    setProject(null);
    setState('not-found');
  }, [setProject, setState]);
  const applyError = useCallback((error: unknown): void => {
    setProject(null);
    setErrorMessage(toErrorMessage(error, 'Unable to load this project.'));
    setState('error');
  }, [setErrorMessage, setProject, setState]);

  return { start, applyReady, applyNotFound, applyError };
};

function useProjectDetail(projectId: string | null, service: ProjectService): ProjectDetailResult {
  const [state, setState] = useState<DetailState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [project, setProject] = useState<WritingProject | null>(null);
  const { start, applyReady, applyNotFound, applyError } = useProjectLoadHandlers(
    setState,
    setErrorMessage,
    setProject,
  );

  const reload = useCallback(async (): Promise<void> => {
    if (!projectId) {
      return;
    }

    await loadProjectDetail(projectId, service, {
      start,
      applyReady,
      applyNotFound,
      applyError,
      shouldApply: () => true,
    });
  }, [applyError, applyNotFound, applyReady, projectId, service, start]);

  useEffect(() => {
    let isMounted = true;
    if (projectId) {
      void loadProjectDetail(projectId, service, {
        start,
        applyReady,
        applyNotFound,
        applyError,
        shouldApply: () => isMounted,
      });
    }

    return () => {
      isMounted = false;
    };
  }, [applyError, applyNotFound, applyReady, projectId, service, start]);

  return { state, errorMessage, project, reload };
}

function CenteredMessage({
  title,
  description,
  tone = 'muted',
}: {
  title: string;
  description: string;
  tone?: 'muted' | 'destructive';
}): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-center gap-3 px-4">
      <h1 className="text-2xl font-headline font-semibold">{title}</h1>
      <p className={`text-sm ${tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground'}`}>
        {description}
      </p>
      <Link className="text-sm font-medium text-primary underline" href="/workspace">
        Back to workspace
      </Link>
    </main>
  );
}

function ProjectStats({ project }: { project: WritingProject }): ReactElement {
  return (
    <section className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3">
      <p>Words: {project.stats.wordCount}</p>
      <p>Scenes: {project.stats.sceneCount}</p>
      <p>Chapters: {project.stats.chapterCount}</p>
      <p>Language: {project.settings.language}</p>
      <p>Target words: {project.settings.targetWordCount ?? 'Not set'}</p>
      <p>Created: {formatProjectDate(project.createdAt)}</p>
    </section>
  );
}

function SceneList({ projectId, project }: { projectId: string; project: WritingProject }): ReactElement {
  const orderedScenes = project.sceneOrder
    .map((sceneId) => project.scenes[sceneId])
    .filter((scene): scene is NonNullable<typeof scene> => Boolean(scene));

  if (orderedScenes.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No scenes yet. Create your first scene.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {orderedScenes.map((scene) => (
        <li key={scene.id} className="rounded-lg border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-headline font-semibold">{scene.title}</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <SceneStatusBadge status={scene.status} />
                <span>Updated: {formatProjectDate(scene.updatedAt)}</span>
              </div>
            </div>
            <Link
              href={`/workspace/${projectId}/scene/${scene.id}`}
              className="inline-flex rounded-md border px-3 py-2 text-sm font-medium"
            >
              Open
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ProjectScenesSection({ projectId, project, actions }: {
  project: WritingProject;
  projectId: string;
  actions: SceneActions;
}): ReactElement {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-headline font-semibold">Scenes</h2>
        <button
          type="button"
          onClick={() => {
            void actions.createScene();
          }}
          disabled={actions.isCreatingScene}
          className="inline-flex rounded-md border bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actions.isCreatingScene ? 'Creating...' : 'Create scene'}
        </button>
      </div>
      {actions.sceneActionError ? <p className="text-sm text-destructive">{actions.sceneActionError}</p> : null}
      <SceneList projectId={projectId} project={project} />
    </section>
  );
}

function ProjectStoryBibleSection({ projectId }: { projectId: string }): ReactElement {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-2xl font-headline font-semibold">Story Bible</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage characters, locations, lore, and continuity links for this project.
      </p>
      <div className="mt-3">
        <Link
          className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          href={`/workspace/${projectId}/bible`}
        >
          Open Story Bible
        </Link>
      </div>
    </section>
  );
}

function ProjectDetailView({
  project,
  projectId,
  actions,
}: {
  project: WritingProject;
  projectId: string;
  actions: SceneActions;
}): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-headline font-bold">{project.title}</h1>
        <p className="text-sm text-muted-foreground">
          {project.description.length > 0 ? project.description : 'No description for this project.'}
        </p>
        <p className="text-xs text-muted-foreground">Last updated: {formatProjectDate(project.updatedAt)}</p>
      </header>

      <ProjectStats project={project} />
      <ProjectScenesSection projectId={projectId} project={project} actions={actions} />
      <ProjectStoryBibleSection projectId={projectId} />
      <Link className="text-sm font-medium text-primary underline" href="/workspace">
        Back to workspace
      </Link>
    </main>
  );
}

function ProjectPageState({
  projectId,
  detail,
  actions,
}: {
  projectId: string | null;
  detail: ProjectDetailResult;
  actions: SceneActions;
}): ReactElement {
  if (!projectId) {
    return renderInvalidProjectIdState();
  }

  if (detail.state === 'loading') {
    return renderLoadingProjectState();
  }

  if (detail.state === 'not-found') {
    return renderProjectNotFoundState();
  }

  if (detail.state === 'error') {
    return renderProjectErrorState(detail.errorMessage);
  }

  if (!detail.project) {
    return renderUnavailableProjectState();
  }

  return <ProjectDetailView project={detail.project} projectId={projectId} actions={actions} />;
}

function renderInvalidProjectIdState(): ReactElement {
  return (
    <CenteredMessage
      description="The URL does not contain a valid project identifier."
      title="Invalid project id"
    />
  );
}

function renderLoadingProjectState(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
      <p>Loading project...</p>
    </main>
  );
}

function renderProjectNotFoundState(): ReactElement {
  return (
    <CenteredMessage
      description="This project does not exist in local storage."
      title="Project not found"
    />
  );
}

function renderProjectErrorState(errorMessage: string | null): ReactElement {
  return (
    <CenteredMessage
      description={errorMessage ?? 'Unable to open project.'}
      title="Unable to open project"
      tone="destructive"
    />
  );
}

function renderUnavailableProjectState(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
      <p>Unable to load project.</p>
    </main>
  );
}

export default function WorkspaceProjectPage(): ReactElement {
  const projectId = useProjectIdParam();
  const repository = useMemo(() => new LocalProjectRepository(), []);
  const projectService = useMemo(() => createProjectService(repository), [repository]);
  const sceneService = useMemo(() => new SceneEditorService(repository), [repository]);

  const [isCreatingScene, setIsCreatingScene] = useState<boolean>(false);
  const [sceneActionError, setSceneActionError] = useState<string | null>(null);
  const detail = useProjectDetail(projectId, projectService);

  const createScene = useCallback(async (): Promise<void> => {
    if (!projectId || !detail.project) {
      return;
    }

    setSceneActionError(null);
    setIsCreatingScene(true);
    try {
      await sceneService.createScene({
        projectId,
        title: getNextSceneTitle(detail.project),
      });
      await detail.reload();
    } catch (error) {
      setSceneActionError(sceneService.toUserErrorMessage(error));
    } finally {
      setIsCreatingScene(false);
    }
  }, [detail, projectId, sceneService]);

  return (
    <ProjectPageState
      projectId={projectId}
      detail={detail}
      actions={{
        isCreatingScene,
        sceneActionError,
        createScene,
      }}
    />
  );
}
