import type { ReactElement } from 'react';
import { ProjectCard } from '@/components/workspace/project-card';
import { ProjectForm, type ProjectFormValues } from '@/components/workspace/project-form';
import type { WritingProject } from '@/domain/project/types';

type WorkspacePageContentProps = {
  projects: WritingProject[];
  loading: boolean;
  errorMessage: string | null;
  editingProjectId: string | null;
  submitting: boolean;
  onRetry: () => void;
  onCreateProject: (values: ProjectFormValues) => Promise<void>;
  onEditProject: (projectId: string) => void;
  onCancelEdit: () => void;
  onUpdateProject: (projectId: string, values: ProjectFormValues) => Promise<void>;
  onDeleteProject: (projectId: string) => void;
};

function WorkspaceHeader(): ReactElement {
  return (
    <section className="space-y-2">
      <h1 className="text-3xl font-headline font-bold">Project Workspace</h1>
      <p className="text-sm text-muted-foreground">
        Manage local writing projects. Everything persists in your browser storage.
      </p>
    </section>
  );
}

function WorkspaceErrorBanner({
  errorMessage,
  onRetry,
}: {
  errorMessage: string;
  onRetry: () => void;
}): ReactElement {
  return (
    <section className="rounded-lg border border-destructive/40 bg-destructive/10 p-4" data-testid="workspace-error" role="alert">
      <p className="text-sm text-destructive">{errorMessage}</p>
      <button
        className="mt-3 rounded-md border border-destructive bg-background px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        onClick={onRetry}
        type="button"
      >
        Retry
      </button>
    </section>
  );
}

type WorkspaceProjectItemProps = {
  project: WritingProject;
  isEditing: boolean;
  submitting: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdateProject: (values: ProjectFormValues) => Promise<void>;
  onDelete: () => void;
};

function WorkspaceProjectItem({
  project,
  isEditing,
  submitting,
  onEdit,
  onCancelEdit,
  onUpdateProject,
  onDelete,
}: WorkspaceProjectItemProps): ReactElement {
  return (
    <ProjectCard isEditing={isEditing} onDelete={onDelete} onEdit={onEdit} project={project}>
      <ProjectForm
        initialValues={{
          title: project.title,
          description: project.description,
          settings: {
            language: project.settings.language,
            targetWordCount: project.settings.targetWordCount,
          },
        }}
        isSubmitting={submitting}
        mode="edit"
        onCancel={onCancelEdit}
        onSubmit={onUpdateProject}
        title={`Edit ${project.title}`}
      />
    </ProjectCard>
  );
}

type WorkspaceProjectItemsProps = {
  projects: WritingProject[];
  editingProjectId: string | null;
  submitting: boolean;
  onEditProject: (projectId: string) => void;
  onCancelEdit: () => void;
  onUpdateProject: (projectId: string, values: ProjectFormValues) => Promise<void>;
  onDeleteProject: (projectId: string) => void;
};

function WorkspaceProjectItems({
  projects,
  editingProjectId,
  submitting,
  onEditProject,
  onCancelEdit,
  onUpdateProject,
  onDeleteProject,
}: WorkspaceProjectItemsProps): ReactElement {
  return (
    <>
      {projects.map((project) => (
        <WorkspaceProjectItem
          isEditing={project.id === editingProjectId}
          key={project.id}
          onCancelEdit={onCancelEdit}
          onDelete={() => {
            onDeleteProject(project.id);
          }}
          onEdit={() => {
            onEditProject(project.id);
          }}
          onUpdateProject={async (values) => {
            await onUpdateProject(project.id, values);
          }}
          project={project}
          submitting={submitting}
        />
      ))}
    </>
  );
}

function WorkspaceProjectList({
  projects,
  loading,
  editingProjectId,
  submitting,
  onEditProject,
  onCancelEdit,
  onUpdateProject,
  onDeleteProject,
}: Omit<WorkspacePageContentProps, 'errorMessage' | 'onRetry' | 'onCreateProject'>): ReactElement {
  if (loading) {
    return <p data-testid="workspace-loading">Loading projects...</p>;
  }

  if (projects.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground" data-testid="workspace-empty">
        No projects yet. Create your first project.
      </p>
    );
  }

  return (
    <WorkspaceProjectItems
      editingProjectId={editingProjectId}
      onCancelEdit={onCancelEdit}
      onDeleteProject={onDeleteProject}
      onEditProject={onEditProject}
      onUpdateProject={onUpdateProject}
      projects={projects}
      submitting={submitting}
    />
  );
}

export function WorkspacePageContent({
  projects,
  loading,
  errorMessage,
  editingProjectId,
  submitting,
  onRetry,
  onCreateProject,
  onEditProject,
  onCancelEdit,
  onUpdateProject,
  onDeleteProject,
}: WorkspacePageContentProps): ReactElement {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <WorkspaceHeader />
      {errorMessage ? <WorkspaceErrorBanner errorMessage={errorMessage} onRetry={onRetry} /> : null}
      <ProjectForm isSubmitting={submitting} mode="create" onSubmit={onCreateProject} />
      <section className="space-y-3">
        <h2 className="text-2xl font-headline font-semibold">Projects</h2>
        <WorkspaceProjectList
          editingProjectId={editingProjectId}
          loading={loading}
          onCancelEdit={onCancelEdit}
          onDeleteProject={onDeleteProject}
          onEditProject={onEditProject}
          onUpdateProject={onUpdateProject}
          projects={projects}
          submitting={submitting}
        />
      </section>
    </main>
  );
}
