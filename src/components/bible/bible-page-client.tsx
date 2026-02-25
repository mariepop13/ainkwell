'use client';

import Link from 'next/link';
import { type ReactElement, useMemo, useState } from 'react';
import { BibleEditor } from '@/components/bible/bible-editor';
import { BibleList } from '@/components/bible/bible-list';
import { RelationshipEditor } from '@/components/bible/relationship-editor';
import { SceneLinks } from '@/components/bible/scene-links';
import { BibleService, BibleValidationError } from '@/application/bible/bible-service';
import { LocalBibleRepository } from '@/data/bible/local-bible-repository';
import type {
  BibleEntityCategory,
  SaveBibleEntityInput,
  SaveBibleRelationshipInput,
  SaveBibleSceneLinkInput,
} from '@/domain/bible/types';

interface BiblePageClientProps {
  projectId: string;
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

function toErrorMessage(error: unknown): string {
  if (error instanceof BibleValidationError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected error while updating the Story Bible';
}

function createService(projectId: string): BibleService | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const repository = new LocalBibleRepository(window.localStorage);
  const service = new BibleService(repository);
  service.seedScenes(projectId);
  return service;
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

export function BiblePageClient({ projectId }: BiblePageClientProps): ReactElement {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isCreatingEntity, setIsCreatingEntity] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BibleEntityCategory | 'all'>('all');
  const [errors, setErrors] = useState<ErrorState>(EMPTY_ERRORS);
  const [, setDataRevision] = useState(0);
  const service = useMemo(() => createService(projectId), [projectId]);
  const entityFilters = useMemo(
    () => ({
      search: searchValue,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
    }),
    [searchValue, categoryFilter],
  );

  const data: BibleDataSnapshot = service
    ? {
        entities: service.listEntities(projectId, entityFilters),
        relationships: service.listRelationships(projectId),
        sceneLinks: service.listSceneLinks(projectId),
        scenes: service.listScenes(projectId),
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
    setErrors((currentErrors) => ({ ...currentErrors, [key]: toErrorMessage(error) }));
  };

  const withService = (callback: (nextService: BibleService) => void): void => {
    if (!service) {
      return;
    }
    callback(service);
    triggerRefresh();
  };

  const handleSaveEntity = async (input: SaveBibleEntityInput): Promise<void> => {
    try {
      withService((nextService) => {
        clearError('entity');
        const savedEntity = nextService.saveEntity(input);
        setSelectedEntityId(savedEntity.id);
        setIsCreatingEntity(false);
      });
    } catch (error) {
      setError('entity', error);
    }
  };

  const handleDeleteEntity = async (entityId: string): Promise<void> => {
    try {
      withService((nextService) => {
        clearError('entity');
        nextService.deleteEntity(projectId, entityId);
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
      withService((nextService) => {
        clearError('relationship');
        nextService.saveRelationship(input);
      });
    } catch (error) {
      setError('relationship', error);
    }
  };

  const handleDeleteRelationship = async (relationshipId: string): Promise<void> => {
    withService((nextService) => {
      clearError('relationship');
      nextService.deleteRelationship(projectId, relationshipId);
    });
  };

  const handleSaveSceneLink = async (input: SaveBibleSceneLinkInput): Promise<void> => {
    try {
      withService((nextService) => {
        clearError('sceneLink');
        nextService.saveSceneLink(input);
      });
    } catch (error) {
      setError('sceneLink', error);
    }
  };

  const handleDeleteSceneLink = async (sceneLinkId: string): Promise<void> => {
    withService((nextService) => {
      clearError('sceneLink');
      nextService.deleteSceneLink(projectId, sceneLinkId);
    });
  };

  if (!service) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <p className="text-muted-foreground">Loading Story Bible...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <Link href={`/workspace/${projectId}`} className="hover:underline">
            Workspace
          </Link>
        </div>
        <h1 className="text-3xl font-headline font-bold">Story Bible</h1>
        <p className="text-sm text-muted-foreground">Project: {projectId}</p>
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
            projectId={projectId}
            selectedEntity={selectedEntity}
            errorMessage={errors.entity}
            onSave={handleSaveEntity}
            onDelete={handleDeleteEntity}
          />
          <RelationshipEditor
            projectId={projectId}
            entities={data.entities}
            relationships={data.relationships}
            selectedEntityId={activeSelectedEntityId}
            errorMessage={errors.relationship}
            onSave={handleSaveRelationship}
            onDelete={handleDeleteRelationship}
          />
          <SceneLinks
            projectId={projectId}
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
