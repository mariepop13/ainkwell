'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { createProjectService } from '@/application/project/project-service';
import type { ProjectService } from '@/application/project/project-service';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { projectIdSchema } from '@/domain/project/schemas';
import type { WritingProject } from '@/domain/project/types';
import { formatProjectDate } from '@/lib/utils';

type DetailState = 'loading' | 'not-found' | 'ready' | 'error';

type ProjectDetailResult = {
  state: DetailState;
  errorMessage: string | null;
  project: WritingProject | null;
};

function getProjectIdParam(input: string | string[] | undefined): string {
  if (Array.isArray(input)) {
    return input[0] ?? '';
  }

  return input ?? '';
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Unable to load this project.';
}

function useProjectDetail(projectId: string | null, service: ProjectService): ProjectDetailResult {
  const [state, setState] = useState<DetailState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [project, setProject] = useState<WritingProject | null>(null);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const loadProject = async (): Promise<void> => {
      setState('loading');
      setErrorMessage(null);
      const loadedProject = await service.getProjectById(projectId);

      if (!loadedProject) {
        setProject(null);
        setState('not-found');
        return;
      }

      setProject(loadedProject);
      setState('ready');
    };

    loadProject().catch((error: unknown) => {
      setProject(null);
      setErrorMessage(readErrorMessage(error));
      setState('error');
    });
  }, [projectId, service]);

  return { state, errorMessage, project };
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

function ProjectPlaceholders(): ReactElement {
  return (
    <section className="space-y-3">
      <div className="rounded-lg border border-dashed p-4">
        <h2 className="text-xl font-headline font-semibold">Scene Editor (placeholder)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The markdown scene editor will consume this project id and settings in a future branch.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-4">
        <h2 className="text-xl font-headline font-semibold">Story Bible (placeholder)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Story bible entities will be scoped by this project id in a future branch.
        </p>
      </div>
    </section>
  );
}

function ProjectDetailContent({ project }: { project: WritingProject }): ReactElement {
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
      <ProjectPlaceholders />
      <Link className="text-sm font-medium text-primary underline" href="/workspace">
        Back to workspace
      </Link>
    </main>
  );
}

export default function WorkspaceProjectPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const service = useMemo(() => createProjectService(new LocalProjectRepository()), []);
  const projectIdParam = getProjectIdParam(params.projectId);
  const parsedProjectId = projectIdSchema.safeParse(projectIdParam);
  const projectId = parsedProjectId.success ? parsedProjectId.data : null;
  const { state, errorMessage, project } = useProjectDetail(projectId, service);

  if (!projectId) {
    return <CenteredMessage description="The URL does not contain a valid project identifier." title="Invalid project id" />;
  }

  if (state === 'loading') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
        <p>Loading project...</p>
      </main>
    );
  }

  if (state === 'not-found') {
    return <CenteredMessage description="This project does not exist in local storage." title="Project not found" />;
  }

  if (state === 'error') {
    return <CenteredMessage description={errorMessage ?? 'Unable to open project.'} title="Unable to open project" tone="destructive" />;
  }

  if (!project) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
        <p>Unable to load project.</p>
      </main>
    );
  }

  return <ProjectDetailContent project={project} />;
}
