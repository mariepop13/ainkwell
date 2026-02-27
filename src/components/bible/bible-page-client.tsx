'use client';

import Link from 'next/link';
import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { createProjectService } from '@/application/project/project-service';
import { BibleService, BibleValidationError } from '@/application/bible/bible-service';
import { BibleEditor } from '@/components/bible/bible-editor';
import { BibleList } from '@/components/bible/bible-list';
import { RelationshipEditor } from '@/components/bible/relationship-editor';
import { SceneLinks } from '@/components/bible/scene-links';
import { LocalBibleRepository } from '@/data/bible/local-bible-repository';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { projectIdSchema } from '@/domain/project/schemas';
import type { WritingProject } from '@/domain/project/types';
import type {
  BibleEntityCategory,
  SaveBibleEntityInput,
  SaveBibleRelationshipInput,
  SaveBibleSceneLinkInput,
} from '@/domain/bible/types';

interface BiblePageClientProps {
  projectId: string;
}

type ProjectAccessState = 'loading' | 'invalid' | 'not-found' | 'error' | 'ready';

interface ProjectAccess {
  state: ProjectAccessState;
  errorMessage: string | null;
  project: WritingProject | null;
}

interface BibleDataSnapshot {
  entities: ReturnType<BibleService['listEntities']>;
  relationships: ReturnType<BibleService['listRelationships']>;
  sceneLinks: ReturnType<BibleService['listSceneLinks']>;
  scenes: ReturnType<BibleService['listScenes']>;
}

interface ErrorState {
  entity: string | null;
  relationship: string | null;
  sceneLink: string | null;
}

const EMPTY_BIBLE_DATA: BibleDataSnapshot = {
  entities: [],
  relationships: [],
  sceneLinks: [],
  scenes: [],
};

const EMPTY_ERRORS: ErrorState = {
  entity: null,
  relationship: null,
  sceneLink: null,
};

function readErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function toBibleErrorMessage(error: unknown): string {
  if (error instanceof BibleValidationError) {
    return error.message;
  }
  return readErrorMessage(error, 'Unexpected error while updating the Story Bible');
}

function getSelectedEntity(entities: BibleDataSnapshot['entities'], selectedEntityId: string | null) {
  if (selectedEntityId) {
    const selectedEntity = entities.find((entity) => entity.id === selectedEntityId);
    if (selectedEntity) {
      return selectedEntity;
    }
  }
  return entities[0] ?? null;
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

function useProjectAccess(projectId: string): ProjectAccess {
  const projectService = useMemo(
    () => createProjectService(new LocalProjectRepository()),
    [],
  );
  const [state, setState] = useState<ProjectAccessState>('loading');
  const [project, setProject] = useState<WritingProject | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const parsedProjectId = projectIdSchema.safeParse(projectId);
    if (!parsedProjectId.success) {
      setProject(null);
      setErrorMessage(null);
      setState('invalid');
      return undefined;
    }

    let isActive = true;

    const loadProject = async (): Promise<void> => {
      setState('loading');
      setErrorMessage(null);

      try {
        const loadedProject = await projectService.getProjectById(parsedProjectId.data);
        if (!isActive) {
          return;
        }

        if (!loadedProject) {
          setProject(null);
          setState('not-found');
          return;
        }

        setProject(loadedProject);
        setState('ready');
      } catch (error) {
        if (!isActive) {
          return;
        }

        setProject(null);
        setErrorMessage(readErrorMessage(error, 'Unable to open project.'));
        setState('error');
      }
    };

    void loadProject();

    return () => {
      isActive = false;
    };
  }, [projectId, projectService]);

  return { state, errorMessage, project };
}

function createBibleService(): BibleService | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return new BibleService(new LocalBibleRepository(window.localStorage));
}

export function BiblePageClient({ projectId }: BiblePageClientProps): ReactElement {
  const projectAccess = useProjectAccess(projectId);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isCreatingEntity, setIsCreatingEntity] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BibleEntityCategory | 'all'>('all');
  const [errors, setErrors] = useState<ErrorState>(EMPTY_ERRORS);
  const [, setDataRevision] = useState(0);
  const bibleService = useMemo(
    () => (projectAccess.state === 'ready' ? createBibleService() : null),
    [projectAccess.state],
  );
  const entityFilters = useMemo(
    () => ({
      search: searchValue,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
    }),
    [searchValue, categoryFilter],
  );

  useEffect(() => {
    if (!bibleService || !projectAccess.project) {
      return;
    }

    bibleService.seedScenes(projectAccess.project.id);
    setDataRevision((currentRevision) => currentRevision + 1);
  }, [bibleService, projectAccess.project]);

  const data: BibleDataSnapshot =
    bibleService && projectAccess.project
      ? {
          entities: bibleService.listEntities(projectAccess.project.id, entityFilters),
          relationships: bibleService.listRelationships(projectAccess.project.id),
          sceneLinks: bibleService.listSceneLinks(projectAccess.project.id),
          scenes: bibleService.listScenes(projectAccess.project.id),
        }
      : EMPTY_BIBLE_DATA;

  const selectedEntity = useMemo(() => {
    if (isCreatingEntity) {
      return null;
    }
    return getSelectedEntity(data.entities, selectedEntityId);
  }, [data.entities, isCreatingEntity, selectedEntityId]);
  const activeSelectedEntityId = selectedEntity?.id ?? null;

  const triggerRefresh = (): void => {
    setDataRevision((currentRevision) => currentRevision + 1);
  };

  const clearError = (key: keyof ErrorState): void => {
    setErrors((currentErrors) => ({ ...currentErrors, [key]: null }));
  };

  const setError = (key: keyof ErrorState, error: unknown): void => {
    setErrors((currentErrors) => ({ ...currentErrors, [key]: toBibleErrorMessage(error) }));
  };

  const withBibleService = (callback: (service: BibleService, validProjectId: string) => void): void => {
    if (!bibleService || !projectAccess.project) {
      return;
    }

    callback(bibleService, projectAccess.project.id);
    triggerRefresh();
  };

  const handleSaveEntity = async (input: SaveBibleEntityInput): Promise<void> => {
    try {
      withBibleService((service, validProjectId) => {
        clearError('entity');
        const savedEntity = service.saveEntity({ ...input, projectId: validProjectId });
        setSelectedEntityId(savedEntity.id);
        setIsCreatingEntity(false);
      });
    } catch (error) {
      setError('entity', error);
    }
  };

  const handleDeleteEntity = async (entityId: string): Promise<void> => {
    try {
      withBibleService((service, validProjectId) => {
        clearError('entity');
        service.deleteEntity(validProjectId, entityId);
        if (activeSelectedEntityId === entityId) {
          setSelectedEntityId(null);
          setIsCreatingEntity(false);
        }
      });
    } catch (error) {
      setError('entity', error);
    }
  };

  const handleSaveRelationship = async (input: SaveBibleRelationshipInput): Promise<void> => {
    try {
      withBibleService((service, validProjectId) => {
        clearError('relationship');
        service.saveRelationship({ ...input, projectId: validProjectId });
      });
    } catch (error) {
      setError('relationship', error);
    }
  };

  const handleDeleteRelationship = async (relationshipId: string): Promise<void> => {
    withBibleService((service, validProjectId) => {
      clearError('relationship');
      service.deleteRelationship(validProjectId, relationshipId);
    });
  };

  const handleSaveSceneLink = async (input: SaveBibleSceneLinkInput): Promise<void> => {
    try {
      withBibleService((service, validProjectId) => {
        clearError('sceneLink');
        service.saveSceneLink({ ...input, projectId: validProjectId });
      });
    } catch (error) {
      setError('sceneLink', error);
    }
  };

  const handleDeleteSceneLink = async (sceneLinkId: string): Promise<void> => {
    withBibleService((service, validProjectId) => {
      clearError('sceneLink');
      service.deleteSceneLink(validProjectId, sceneLinkId);
    });
  };

  if (projectAccess.state === 'invalid') {
    return (
      <CenteredMessage
        title="Invalid project id"
        description="The Story Bible route requires a valid project identifier."
      />
    );
  }

  if (projectAccess.state === 'loading') {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
        <p>Loading project...</p>
      </main>
    );
  }

  if (projectAccess.state === 'not-found') {
    return (
      <CenteredMessage
        title="Project not found"
        description="This project does not exist in local storage."
      />
    );
  }

  if (projectAccess.state === 'error') {
    return (
      <CenteredMessage
        title="Unable to open Story Bible"
        description={projectAccess.errorMessage ?? 'Unable to open this project Story Bible.'}
        tone="destructive"
      />
    );
  }

  if (!projectAccess.project || !bibleService) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4">
        <p>Loading Story Bible...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link href="/workspace" className="hover:underline">
            Workspace
          </Link>
          <span>/</span>
          <Link href={`/workspace/${projectAccess.project.id}`} className="hover:underline">
            {projectAccess.project.title}
          </Link>
          <span>/</span>
          <span>Story Bible</span>
        </div>
        <h1 className="text-3xl font-headline font-bold">Story Bible</h1>
        <p className="text-sm text-muted-foreground">Project: {projectAccess.project.title}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <BibleList
          entities={data.entities}
          selectedEntityId={activeSelectedEntityId}
          searchValue={searchValue}
          categoryFilter={categoryFilter}
          onSearchChange={setSearchValue}
          onCategoryFilterChange={setCategoryFilter}
          onSelectEntity={(entityId) => {
            setSelectedEntityId(entityId);
            setIsCreatingEntity(false);
          }}
          onCreateEntity={() => {
            setSelectedEntityId(null);
            setIsCreatingEntity(true);
          }}
        />
        <div className="space-y-4">
          <BibleEditor
            key={activeSelectedEntityId ?? 'new-entity'}
            projectId={projectAccess.project.id}
            selectedEntity={selectedEntity}
            errorMessage={errors.entity}
            onSave={handleSaveEntity}
            onDelete={handleDeleteEntity}
          />
          <RelationshipEditor
            projectId={projectAccess.project.id}
            entities={data.entities}
            relationships={data.relationships}
            selectedEntityId={activeSelectedEntityId}
            errorMessage={errors.relationship}
            onSave={handleSaveRelationship}
            onDelete={handleDeleteRelationship}
          />
          <SceneLinks
            projectId={projectAccess.project.id}
            entities={data.entities}
            scenes={data.scenes}
            sceneLinks={data.sceneLinks}
            selectedEntityId={activeSelectedEntityId}
            errorMessage={errors.sceneLink}
            onSave={handleSaveSceneLink}
            onDelete={handleDeleteSceneLink}
          />
        </div>
      </div>
    </main>
  );
}
