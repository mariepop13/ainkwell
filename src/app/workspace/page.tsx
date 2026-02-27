'use client';

import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createProjectService } from '@/application/project/project-service';
import type { ProjectService } from '@/application/project/project-service';
import { WorkspacePageContent } from '@/components/workspace/workspace-page-content';
import type { ProjectFormValues } from '@/components/workspace/project-form';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import type { WritingProject } from '@/domain/project/types';

type SetBooleanState = Dispatch<SetStateAction<boolean>>;
type SetStringState = Dispatch<SetStateAction<string | null>>;
type SetProjectsState = Dispatch<SetStateAction<WritingProject[]>>;

type ActionSharedState = {
  service: ProjectService;
  setErrorMessage: SetStringState;
  setSubmitting: SetBooleanState;
  setProjects: SetProjectsState;
};

type WorkspacePageState = {
  projects: WritingProject[];
  loading: boolean;
  errorMessage: string | null;
  editingProjectId: string | null;
  submitting: boolean;
  loadProjects: () => Promise<void>;
  createProject: (values: ProjectFormValues) => Promise<void>;
  updateProject: (projectId: string, values: ProjectFormValues) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setEditingProjectId: Dispatch<SetStateAction<string | null>>;
};

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

async function refreshProjects(service: ProjectService, setProjects: SetProjectsState): Promise<void> {
  const nextProjects = await service.listProjects();
  setProjects(nextProjects);
}

function useLoadProjects(
  service: ProjectService,
  setProjects: SetProjectsState,
  setLoading: SetBooleanState,
  setErrorMessage: SetStringState,
): () => Promise<void> {
  return useCallback(async (): Promise<void> => {
    setErrorMessage(null);
    setLoading(true);

    try {
      await refreshProjects(service, setProjects);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, 'Unable to load projects.'));
    } finally {
      setLoading(false);
    }
  }, [service, setErrorMessage, setLoading, setProjects]);
}

function useCreateProjectAction({
  service,
  setErrorMessage,
  setSubmitting,
  setProjects,
}: ActionSharedState): (values: ProjectFormValues) => Promise<void> {
  return useCallback(async (values: ProjectFormValues): Promise<void> => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      await service.createProject(values);
      await refreshProjects(service, setProjects);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, 'Unable to create project.'));
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [service, setErrorMessage, setProjects, setSubmitting]);
}

function useUpdateProjectAction({
  service,
  setErrorMessage,
  setSubmitting,
  setProjects,
  setEditingProjectId,
}: ActionSharedState & {
  setEditingProjectId: Dispatch<SetStateAction<string | null>>;
}): (projectId: string, values: ProjectFormValues) => Promise<void> {
  return useCallback(async (projectId: string, values: ProjectFormValues): Promise<void> => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      await service.updateProject(projectId, values);
      await refreshProjects(service, setProjects);
      setEditingProjectId(null);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, 'Unable to update project.'));
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [service, setEditingProjectId, setErrorMessage, setProjects, setSubmitting]);
}

function useDeleteProjectAction({
  service,
  setErrorMessage,
  setSubmitting,
  setProjects,
  editingProjectId,
  setEditingProjectId,
}: ActionSharedState & {
  editingProjectId: string | null;
  setEditingProjectId: Dispatch<SetStateAction<string | null>>;
}): (projectId: string) => Promise<void> {
  return useCallback(async (projectId: string): Promise<void> => {
    const shouldDelete = window.confirm('Delete this project?');

    if (!shouldDelete) {
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      await service.deleteProject(projectId);
      if (editingProjectId === projectId) {
        setEditingProjectId(null);
      }
      await refreshProjects(service, setProjects);
    } catch (error) {
      setErrorMessage(toErrorMessage(error, 'Unable to delete project.'));
    } finally {
      setSubmitting(false);
    }
  }, [editingProjectId, service, setEditingProjectId, setErrorMessage, setProjects, setSubmitting]);
}

function useWorkspacePageState(service: ProjectService): WorkspacePageState {
  const [projects, setProjects] = useState<WritingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const loadProjects = useLoadProjects(service, setProjects, setLoading, setErrorMessage);
  const createProject = useCreateProjectAction({ service, setErrorMessage, setSubmitting, setProjects });
  const updateProject = useUpdateProjectAction({
    service,
    setErrorMessage,
    setSubmitting,
    setProjects,
    setEditingProjectId,
  });
  const deleteProject = useDeleteProjectAction({
    service,
    setErrorMessage,
    setSubmitting,
    setProjects,
    editingProjectId,
    setEditingProjectId,
  });

  return {
    projects,
    loading,
    errorMessage,
    editingProjectId,
    submitting,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setEditingProjectId,
  };
}

export default function WorkspacePage(): ReactElement {
  const service = useMemo(() => createProjectService(new LocalProjectRepository()), []);
  const workspaceState = useWorkspacePageState(service);
  const { loadProjects } = workspaceState;

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <WorkspacePageContent
      editingProjectId={workspaceState.editingProjectId}
      errorMessage={workspaceState.errorMessage}
      loading={workspaceState.loading}
      onCancelEdit={() => {
        workspaceState.setEditingProjectId(null);
      }}
      onCreateProject={workspaceState.createProject}
      onDeleteProject={(projectId: string) => {
        void workspaceState.deleteProject(projectId);
      }}
      onEditProject={(projectId: string) => {
        workspaceState.setEditingProjectId(projectId);
      }}
      onRetry={() => {
        void loadProjects();
      }}
      onUpdateProject={workspaceState.updateProject}
      projects={workspaceState.projects}
      submitting={workspaceState.submitting}
    />
  );
}
