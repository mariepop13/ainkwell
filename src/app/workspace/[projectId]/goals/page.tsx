'use client';

import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';

import { createProjectService } from '@/application/project/project-service';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { GoalsPageClient } from '@/components/writing-session/goals-page-client';
import { projectIdSchema } from '@/domain/project/schemas';
import { useEffect, useState } from 'react';
import type { WritingProject } from '@/domain/project/types';
import Link from 'next/link';

const getProjectIdParam = (input: string | string[] | undefined): string => {
  if (Array.isArray(input)) {
    return input[0] ?? '';
  }

  return input ?? '';
};

function LoadingMessage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
      <p>Loading project...</p>
    </main>
  );
}

function InvalidProjectMessage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-center gap-3 px-4">
      <h1 className="text-2xl font-headline font-semibold">Invalid project id</h1>
      <p className="text-sm text-muted-foreground">The URL does not contain a valid project identifier.</p>
      <Link className="text-sm font-medium text-primary underline" href="/workspace">
        Back to workspace
      </Link>
    </main>
  );
}

function ProjectNotFoundMessage(): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-center gap-3 px-4">
      <h1 className="text-2xl font-headline font-semibold">Project not found</h1>
      <p className="text-sm text-muted-foreground">This project does not exist in local storage.</p>
      <Link className="text-sm font-medium text-primary underline" href="/workspace">
        Back to workspace
      </Link>
    </main>
  );
}

export default function WritingGoalsPage(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const projectIdParam = getProjectIdParam(params.projectId);
  const parsedProjectId = projectIdSchema.safeParse(projectIdParam);
  const projectId = parsedProjectId.success ? parsedProjectId.data : null;

  const repository = useMemo(() => new LocalProjectRepository(), []);
  const projectService = useMemo(() => createProjectService(repository), [repository]);

  const [project, setProject] = useState<WritingProject | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'not-found'>('loading');

  useEffect(() => {
    let isMounted = true;

    if (projectId) {
      void projectService.getProjectById(projectId).then((loaded) => {
        if (!isMounted) return;
        if (!loaded) { setLoadState('not-found'); return; }
        setProject(loaded);
        setLoadState('ready');
      });
    }

    return () => {
      isMounted = false;
    };
  }, [projectId, projectService]);

  if (!projectId) {
    return <InvalidProjectMessage />;
  }

  if (loadState === 'loading') {
    return <LoadingMessage />;
  }

  if (loadState === 'not-found' || !project) {
    return <ProjectNotFoundMessage />;
  }

  return <GoalsPageClient projectId={projectId} projectTitle={project.title} />;
}
