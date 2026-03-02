'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ExportService } from '@/application/export/export-service';
import { createChapterService } from '@/application/project/chapter-service';
import { createProjectService } from '@/application/project/project-service';
import type { ProjectService } from '@/application/project/project-service';
import { SceneEditorService } from '@/application/scene/scene-editor-service';
import { ChapterOutlinePanel } from '@/components/workspace/chapter-outline-panel';
import { ChapterForm } from '@/components/workspace/chapter-form';
import { ExportImportPanel } from '@/components/workspace/export-import-panel';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { projectIdSchema } from '@/domain/project/schemas';
import type { ChapterSummary, WritingProject } from '@/domain/project/types';
import { formatProjectDate } from '@/lib/utils';

type DetailState = 'loading' | 'not-found' | 'ready' | 'error';

type ProjectDetailResult = {
  state: DetailState;
  errorMessage: string | null;
  project: WritingProject | null;
  reload: () => Promise<void>;
};

type ProjectLoadHandlers = {
  start: () => void;
  applyReady: (project: WritingProject) => void;
  applyNotFound: () => void;
  applyError: (error: unknown) => void;
  shouldApply: () => boolean;
};

type ChapterActions = {
  isCreatingChapter: boolean;
  showCreateChapterForm: boolean;
  chapterActionError: string | null;
  chapters: ChapterSummary[];
  openCreateChapterForm: () => void;
  closeCreateChapterForm: () => void;
  createChapter: (title: string) => Promise<void>;
  renameChapter: (chapterId: string, title: string) => Promise<void>;
  deleteChapter: (chapterId: string) => Promise<void>;
  reorderChapter: (chapterId: string, direction: 'up' | 'down') => Promise<void>;
  moveSceneToChapter: (sceneId: string, targetChapterId: string) => Promise<void>;
  createScene: (chapterId: string, title: string) => Promise<void>;
};

const deriveChapterSummaries = (project: WritingProject | null): ChapterSummary[] => {
  if (!project) {
    return [];
  }

  return project.chapterOrder.map((chapterId) => {
    const chapter = project.chapters[chapterId];
    return {
      id: chapterId,
      projectId: project.id,
      title: chapter?.title ?? '',
      sceneCount: chapter?.sceneOrder.length ?? 0,
      wordCount: chapter?.wordCount ?? 0,
    };
  });
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

function useChapterActions(
  projectId: string | null,
  project: WritingProject | null,
  repository: LocalProjectRepository,
  reload: () => Promise<void>,
): ChapterActions {
  const chapterService = useMemo(() => createChapterService(repository), [repository]);
  const sceneService = useMemo(() => new SceneEditorService(repository), [repository]);

  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [showCreateChapterForm, setShowCreateChapterForm] = useState(false);
  const [chapterActionError, setChapterActionError] = useState<string | null>(null);

  const chapters = deriveChapterSummaries(project);

  const runChapterAction = useCallback(
    async (action: () => Promise<unknown>): Promise<boolean> => {
      setChapterActionError(null);
      try {
        await action();
        await reload();
        return true;
      } catch (error) {
        setChapterActionError(toErrorMessage(error, 'Chapter action failed.'));
        return false;
      }
    },
    [reload],
  );

  const createChapter = useCallback(
    async (title: string): Promise<void> => {
      if (!projectId) {
        return;
      }

      setIsCreatingChapter(true);
      try {
        const success = await runChapterAction(() => chapterService.createChapter({ projectId, title }));
        if (success) {
          setShowCreateChapterForm(false);
        }
      } finally {
        setIsCreatingChapter(false);
      }
    },
    [chapterService, projectId, runChapterAction],
  );

  const renameChapter = useCallback(
    async (chapterId: string, title: string): Promise<void> => {
      if (!projectId) {
        return;
      }

      await runChapterAction(() => chapterService.renameChapter({ projectId, chapterId, title }));
    },
    [chapterService, projectId, runChapterAction],
  );

  const deleteChapter = useCallback(
    async (chapterId: string): Promise<void> => {
      if (!projectId) {
        return;
      }

      await runChapterAction(() => chapterService.deleteChapter({ projectId, chapterId }));
    },
    [chapterService, projectId, runChapterAction],
  );

  const reorderChapter = useCallback(
    async (chapterId: string, direction: 'up' | 'down'): Promise<void> => {
      if (!projectId) {
        return;
      }

      await runChapterAction(() =>
        chapterService.reorderChapter({ projectId, chapterId, direction }),
      );
    },
    [chapterService, projectId, runChapterAction],
  );

  const moveSceneToChapter = useCallback(
    async (sceneId: string, targetChapterId: string): Promise<void> => {
      if (!projectId) {
        return;
      }

      await runChapterAction(() =>
        chapterService.moveSceneToChapter({ projectId, sceneId, targetChapterId }),
      );
    },
    [chapterService, projectId, runChapterAction],
  );

  const createScene = useCallback(
    async (chapterId: string, title: string): Promise<void> => {
      if (!projectId) {
        return;
      }

      await runChapterAction(() =>
        sceneService.createScene({ projectId, title, chapterId }),
      );
    },
    [projectId, runChapterAction, sceneService],
  );

  return {
    isCreatingChapter,
    showCreateChapterForm,
    chapterActionError,
    chapters,
    openCreateChapterForm: () => { setShowCreateChapterForm(true); },
    closeCreateChapterForm: () => { setShowCreateChapterForm(false); },
    createChapter,
    renameChapter,
    deleteChapter,
    reorderChapter,
    moveSceneToChapter,
    createScene,
  };
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

function ChaptersSection({
  projectId,
  project,
  chapterActions,
}: {
  project: WritingProject;
  projectId: string;
  chapterActions: ChapterActions;
}): ReactElement {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-headline font-semibold">Chapters</h2>
        <button
          type="button"
          onClick={chapterActions.openCreateChapterForm}
          className="inline-flex rounded-md border bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Add Chapter
        </button>
      </div>
      {chapterActions.showCreateChapterForm ? (
        <ChapterForm
          submitLabel="Create"
          onSubmit={chapterActions.createChapter}
          onCancel={chapterActions.closeCreateChapterForm}
        />
      ) : null}
      <ChapterOutlinePanel
        projectId={projectId}
        project={project}
        chapters={chapterActions.chapters}
        actions={{
          createScene: chapterActions.createScene,
          renameChapter: chapterActions.renameChapter,
          deleteChapter: chapterActions.deleteChapter,
          reorderChapter: chapterActions.reorderChapter,
          moveSceneToChapter: chapterActions.moveSceneToChapter,
        }}
        actionError={chapterActions.chapterActionError}
      />
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

function ProjectWritingGoalsSection({ projectId }: { projectId: string }): ReactElement {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-2xl font-headline font-semibold">Writing Goals</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Track daily word count goals, writing sessions, streaks, and weekly progress.
      </p>
      <div className="mt-3">
        <Link
          className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          href={`/workspace/${projectId}/goals`}
        >
          Open Writing Goals
        </Link>
      </div>
    </section>
  );
}

function ProjectDetailView({
  project,
  projectId,
  chapterActions,
  exportService,
}: {
  project: WritingProject;
  projectId: string;
  chapterActions: ChapterActions;
  exportService: ExportService;
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
      <ChaptersSection projectId={projectId} project={project} chapterActions={chapterActions} />
      <ProjectStoryBibleSection projectId={projectId} />
      <ProjectWritingGoalsSection projectId={projectId} />
      <ExportImportPanel exportService={exportService} projectId={projectId} projectTitle={project.title} />
      <Link className="text-sm font-medium text-primary underline" href="/workspace">
        Back to workspace
      </Link>
    </main>
  );
}

function ProjectPageState({
  projectId,
  detail,
  chapterActions,
  exportService,
}: {
  projectId: string | null;
  detail: ProjectDetailResult;
  chapterActions: ChapterActions;
  exportService: ExportService;
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

  return (
    <ProjectDetailView
      project={detail.project}
      projectId={projectId}
      chapterActions={chapterActions}
      exportService={exportService}
    />
  );
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
  const exportService = useMemo(() => new ExportService(repository), [repository]);

  const detail = useProjectDetail(projectId, projectService);
  const chapterActions = useChapterActions(projectId, detail.project, repository, detail.reload);

  return (
    <ProjectPageState
      projectId={projectId}
      detail={detail}
      chapterActions={chapterActions}
      exportService={exportService}
    />
  );
}
