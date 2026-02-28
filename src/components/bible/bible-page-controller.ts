'use client';

import { useEffect, useMemo, useState } from 'react';
import { BibleService, BibleValidationError } from '@/application/bible/bible-service';
import { createProjectService } from '@/application/project/project-service';
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

export type ProjectAccessState = 'loading' | 'invalid' | 'not-found' | 'error' | 'ready';

export interface ProjectAccess {
  state: ProjectAccessState;
  errorMessage: string | null;
  project: WritingProject | null;
}

export interface BibleDataSnapshot {
  entities: ReturnType<BibleService['listEntities']>;
  relationships: ReturnType<BibleService['listRelationships']>;
  sceneLinks: ReturnType<BibleService['listSceneLinks']>;
  scenes: ReturnType<BibleService['listScenes']>;
}

export interface BiblePageController {
  projectAccess: ProjectAccess;
  project: WritingProject | null;
  bibleService: BibleService | null;
  data: BibleDataSnapshot;
  searchValue: string;
  categoryFilter: BibleEntityCategory | 'all';
  selectedEntity: BibleDataSnapshot['entities'][number] | null;
  activeSelectedEntityId: string | null;
  entityError: string | null;
  relationshipError: string | null;
  sceneLinkError: string | null;
  setSearchValue: (value: string) => void;
  setCategoryFilter: (value: BibleEntityCategory | 'all') => void;
  onSelectEntity: (entityId: string) => void;
  onCreateEntity: () => void;
  onSaveEntity: (input: SaveBibleEntityInput) => Promise<void>;
  onDeleteEntity: (entityId: string) => Promise<void>;
  onSaveRelationship: (input: SaveBibleRelationshipInput) => Promise<void>;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
  onSaveSceneLink: (input: SaveBibleSceneLinkInput) => Promise<void>;
  onDeleteSceneLink: (sceneLinkId: string) => Promise<void>;
}

interface EntityActionParams {
  runOperation: (operation: (service: BibleService, validProjectId: string) => void) => void;
  activeSelectedEntityId: string | null;
  setSelectedEntityId: (entityId: string | null) => void;
  setIsCreatingEntity: (value: boolean) => void;
}

interface EntityActions {
  error: string | null;
  saveEntity: (input: SaveBibleEntityInput) => Promise<void>;
  deleteEntity: (entityId: string) => Promise<void>;
}

const EMPTY_BIBLE_DATA: BibleDataSnapshot = {
  entities: [],
  relationships: [],
  sceneLinks: [],
  scenes: [],
};

const LOADING_PROJECT_ACCESS: ProjectAccess = {
  state: 'loading',
  errorMessage: null,
  project: null,
};

const INVALID_PROJECT_ACCESS: ProjectAccess = {
  state: 'invalid',
  errorMessage: null,
  project: null,
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

function createBibleService(projectId: string): BibleService | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const service = new BibleService(new LocalBibleRepository(window.localStorage));
  service.seedScenes(projectId);
  return service;
}

async function fetchProjectAccess(projectId: string): Promise<ProjectAccess> {
  const projectService = createProjectService(new LocalProjectRepository());

  try {
    const loadedProject = await projectService.getProjectById(projectId);
    if (!loadedProject) {
      return { state: 'not-found', errorMessage: null, project: null };
    }

    return { state: 'ready', errorMessage: null, project: loadedProject };
  } catch (error) {
    return {
      state: 'error',
      errorMessage: readErrorMessage(error, 'Unable to open project.'),
      project: null,
    };
  }
}

function useProjectAccess(projectId: string): ProjectAccess {
  const parsedProjectId = useMemo(() => projectIdSchema.safeParse(projectId), [projectId]);
  const [projectAccess, setProjectAccess] = useState<ProjectAccess>(LOADING_PROJECT_ACCESS);

  useEffect(() => {
    if (!parsedProjectId.success) {
      return undefined;
    }

    let isActive = true;
    void fetchProjectAccess(parsedProjectId.data).then((nextProjectAccess) => {
      if (isActive) {
        setProjectAccess(nextProjectAccess);
      }
    });

    return () => {
      isActive = false;
    };
  }, [parsedProjectId]);

  if (!parsedProjectId.success) {
    return INVALID_PROJECT_ACCESS;
  }

  return projectAccess;
}

function useBibleService(projectAccess: ProjectAccess): BibleService | null {
  return useMemo(() => {
    if (projectAccess.state !== 'ready' || !projectAccess.project) {
      return null;
    }

    return createBibleService(projectAccess.project.id);
  }, [projectAccess.project, projectAccess.state]);
}

function useEntityFilters(): {
  searchValue: string;
  categoryFilter: BibleEntityCategory | 'all';
  entityFilters: { search: string; category?: BibleEntityCategory };
  setSearchValue: (value: string) => void;
  setCategoryFilter: (value: BibleEntityCategory | 'all') => void;
} {
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BibleEntityCategory | 'all'>('all');
  const entityFilters = useMemo(
    () => ({ search: searchValue, category: categoryFilter === 'all' ? undefined : categoryFilter }),
    [categoryFilter, searchValue],
  );

  return { searchValue, categoryFilter, entityFilters, setSearchValue, setCategoryFilter };
}

function useBibleDataSnapshot(
  bibleService: BibleService | null,
  projectId: string | null,
  entityFilters: { search: string; category?: BibleEntityCategory },
): BibleDataSnapshot {
  if (!bibleService || !projectId) {
    return EMPTY_BIBLE_DATA;
  }

  return {
    entities: bibleService.listEntities(projectId, entityFilters),
    relationships: bibleService.listRelationships(projectId),
    sceneLinks: bibleService.listSceneLinks(projectId),
    scenes: bibleService.listScenes(projectId),
  };
}

function useEntitySelection(entities: BibleDataSnapshot['entities']): {
  selectedEntity: BibleDataSnapshot['entities'][number] | null;
  activeSelectedEntityId: string | null;
  setSelectedEntityId: (entityId: string | null) => void;
  setIsCreatingEntity: (value: boolean) => void;
  onSelectEntity: (entityId: string) => void;
  onCreateEntity: () => void;
} {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isCreatingEntity, setIsCreatingEntity] = useState(false);
  const selectedEntity = useMemo(() => {
    if (isCreatingEntity) {
      return null;
    }

    return getSelectedEntity(entities, selectedEntityId);
  }, [entities, isCreatingEntity, selectedEntityId]);

  return {
    selectedEntity,
    activeSelectedEntityId: selectedEntity?.id ?? null,
    setSelectedEntityId,
    setIsCreatingEntity,
    onSelectEntity: (entityId: string) => {
      setSelectedEntityId(entityId);
      setIsCreatingEntity(false);
    },
    onCreateEntity: () => {
      setSelectedEntityId(null);
      setIsCreatingEntity(true);
    },
  };
}

function useRefreshTrigger(): () => void {
  const [, setDataRevision] = useState(0);
  return () => {
    setDataRevision((currentRevision) => currentRevision + 1);
  };
}

function useRunBibleOperation(
  bibleService: BibleService | null,
  projectId: string | null,
  triggerRefresh: () => void,
): (operation: (service: BibleService, validProjectId: string) => void) => void {
  return (operation: (service: BibleService, validProjectId: string) => void): void => {
    if (!bibleService || !projectId) {
      return;
    }

    operation(bibleService, projectId);
    triggerRefresh();
  };
}

function useEntityActions({
  runOperation,
  activeSelectedEntityId,
  setSelectedEntityId,
  setIsCreatingEntity,
}: EntityActionParams): EntityActions {
  const [error, setError] = useState<string | null>(null);

  const saveEntity = async (input: SaveBibleEntityInput): Promise<void> => {
    try {
      runOperation((service, validProjectId) => {
        setError(null);
        const savedEntity = service.saveEntity({ ...input, projectId: validProjectId });
        setSelectedEntityId(savedEntity.id);
        setIsCreatingEntity(false);
      });
    } catch (nextError) {
      setError(toBibleErrorMessage(nextError));
    }
  };

  const deleteEntity = async (entityId: string): Promise<void> => {
    try {
      runOperation((service, validProjectId) => {
        setError(null);
        service.deleteEntity(validProjectId, entityId);
        if (activeSelectedEntityId === entityId) {
          setSelectedEntityId(null);
          setIsCreatingEntity(false);
        }
      });
    } catch (nextError) {
      setError(toBibleErrorMessage(nextError));
    }
  };

  return { error, saveEntity, deleteEntity };
}

function useRelationshipActions(
  runOperation: (operation: (service: BibleService, validProjectId: string) => void) => void,
): {
  error: string | null;
  saveRelationship: (input: SaveBibleRelationshipInput) => Promise<void>;
  deleteRelationship: (relationshipId: string) => Promise<void>;
} {
  const [error, setError] = useState<string | null>(null);

  const saveRelationship = async (input: SaveBibleRelationshipInput): Promise<void> => {
    try {
      runOperation((service, validProjectId) => {
        setError(null);
        service.saveRelationship({ ...input, projectId: validProjectId });
      });
    } catch (nextError) {
      setError(toBibleErrorMessage(nextError));
    }
  };

  const deleteRelationship = async (relationshipId: string): Promise<void> => {
    runOperation((service, validProjectId) => {
      setError(null);
      service.deleteRelationship(validProjectId, relationshipId);
    });
  };

  return { error, saveRelationship, deleteRelationship };
}

function useSceneLinkActions(
  runOperation: (operation: (service: BibleService, validProjectId: string) => void) => void,
): {
  error: string | null;
  saveSceneLink: (input: SaveBibleSceneLinkInput) => Promise<void>;
  deleteSceneLink: (sceneLinkId: string) => Promise<void>;
} {
  const [error, setError] = useState<string | null>(null);

  const saveSceneLink = async (input: SaveBibleSceneLinkInput): Promise<void> => {
    try {
      runOperation((service, validProjectId) => {
        setError(null);
        service.saveSceneLink({ ...input, projectId: validProjectId });
      });
    } catch (nextError) {
      setError(toBibleErrorMessage(nextError));
    }
  };

  const deleteSceneLink = async (sceneLinkId: string): Promise<void> => {
    runOperation((service, validProjectId) => {
      setError(null);
      service.deleteSceneLink(validProjectId, sceneLinkId);
    });
  };

  return { error, saveSceneLink, deleteSceneLink };
}

export function useBiblePageController(projectId: string): BiblePageController {
  const projectAccess = useProjectAccess(projectId);
  const { project } = projectAccess;
  const bibleService = useBibleService(projectAccess);
  const { searchValue, categoryFilter, entityFilters, setSearchValue, setCategoryFilter } = useEntityFilters();
  const data = useBibleDataSnapshot(bibleService, project?.id ?? null, entityFilters);
  const selection = useEntitySelection(data.entities);
  const runOperation = useRunBibleOperation(bibleService, project?.id ?? null, useRefreshTrigger());
  const entityActions = useEntityActions({
    runOperation,
    activeSelectedEntityId: selection.activeSelectedEntityId,
    setSelectedEntityId: selection.setSelectedEntityId,
    setIsCreatingEntity: selection.setIsCreatingEntity,
  });
  const relationshipActions = useRelationshipActions(runOperation);
  const sceneLinkActions = useSceneLinkActions(runOperation);
  return createControllerState({
    projectAccess,
    project,
    bibleService,
    data,
    searchValue,
    categoryFilter,
    selectedEntity: selection.selectedEntity,
    activeSelectedEntityId: selection.activeSelectedEntityId,
    entityError: entityActions.error,
    relationshipError: relationshipActions.error,
    sceneLinkError: sceneLinkActions.error,
    setSearchValue,
    setCategoryFilter,
    onSelectEntity: selection.onSelectEntity,
    onCreateEntity: selection.onCreateEntity,
    onSaveEntity: entityActions.saveEntity,
    onDeleteEntity: entityActions.deleteEntity,
    onSaveRelationship: relationshipActions.saveRelationship,
    onDeleteRelationship: relationshipActions.deleteRelationship,
    onSaveSceneLink: sceneLinkActions.saveSceneLink,
    onDeleteSceneLink: sceneLinkActions.deleteSceneLink,
  });
}

function createControllerState(controller: BiblePageController): BiblePageController {
  return controller;
}
