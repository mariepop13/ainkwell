import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import type { WritingProject } from '@/domain/project/types';
import { formatProjectDate } from '@/lib/utils';

type ProjectCardProps = {
  project: WritingProject;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  children?: ReactNode;
};

type ProjectCardActionsProps = {
  projectId: string;
  onEdit: () => void;
  onDelete: () => void;
};

function ProjectCardMetadata({ project }: { project: WritingProject }): ReactElement {
  return (
    <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
      <p>Created: {formatProjectDate(project.createdAt)}</p>
      <p>Updated: {formatProjectDate(project.updatedAt)}</p>
      <p>Words: {project.stats.wordCount}</p>
      <p>Scenes: {project.stats.sceneCount}</p>
      <p>Chapters: {project.stats.chapterCount}</p>
      <p>Language: {project.settings.language}</p>
    </div>
  );
}

function ProjectCardActions({ projectId, onEdit, onDelete }: ProjectCardActionsProps): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent"
        href={`/workspace/${projectId}`}
      >
        Open
      </Link>
      <button
        className="rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        onClick={onEdit}
        type="button"
      >
        Edit
      </button>
      <button
        className="rounded-md border border-destructive bg-background px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        onClick={onDelete}
        type="button"
      >
        Delete
      </button>
    </div>
  );
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  isEditing,
  children,
}: ProjectCardProps): ReactElement {
  return (
    <article className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground" data-testid={`project-card-${project.id}`}>
      <header className="space-y-1">
        <h3 className="text-xl font-headline font-semibold">{project.title}</h3>
        <p className="text-sm text-muted-foreground">
          {project.description.length > 0 ? project.description : 'No description yet.'}
        </p>
      </header>

      <ProjectCardMetadata project={project} />

      {isEditing ? children : <ProjectCardActions onDelete={onDelete} onEdit={onEdit} projectId={project.id} />}
    </article>
  );
}
