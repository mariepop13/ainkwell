'use client';

import { type FormEvent, useMemo, useState } from 'react';
import type {
  BibleEntity,
  BibleSceneLink,
  ProjectScene,
  SaveBibleSceneLinkInput,
} from '@/domain/bible/types';
import { resolveIdInList } from '@/components/bible/bible-editor-utils';

interface SceneLinkFormState {
  entityId: string;
  sceneId: string;
  notes: string;
}

interface SceneLinkFormStateActions {
  state: SceneLinkFormState;
  setEntityId: (value: string) => void;
  setSceneId: (value: string) => void;
  setNotes: (value: string) => void;
  resetNotes: () => void;
}

interface SceneLinksEditorStateInput {
  projectId: string;
  entities: BibleEntity[];
  scenes: ProjectScene[];
  sceneLinks: BibleSceneLink[];
  selectedEntityId: string | null;
  onSave: (input: SaveBibleSceneLinkInput) => void | Promise<void>;
}

export interface SceneLinksEditorState {
  state: SceneLinkFormState;
  entitiesById: Map<string, BibleEntity>;
  scenesById: Map<string, ProjectScene>;
  visibleSceneLinks: BibleSceneLink[];
  resolvedEntityId: string;
  resolvedSceneId: string;
  setEntityId: (value: string) => void;
  setSceneId: (value: string) => void;
  setNotes: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

function useSceneLinkFormState(): SceneLinkFormStateActions {
  const [entityId, setEntityId] = useState('');
  const [sceneId, setSceneId] = useState('');
  const [notes, setNotes] = useState('');

  return {
    state: { entityId, sceneId, notes },
    setEntityId,
    setSceneId,
    setNotes,
    resetNotes: () => setNotes(''),
  };
}

function getVisibleSceneLinks(sceneLinks: BibleSceneLink[], selectedEntityId: string | null): BibleSceneLink[] {
  if (!selectedEntityId) {
    return sceneLinks;
  }

  return sceneLinks.filter((sceneLink) => sceneLink.entityId === selectedEntityId);
}


function createSubmitHandler({
  projectId,
  state,
  resolvedEntityId,
  resolvedSceneId,
  onSave,
  resetNotes,
}: {
  projectId: string;
  state: SceneLinkFormState;
  resolvedEntityId: string;
  resolvedSceneId: string;
  onSave: (input: SaveBibleSceneLinkInput) => void | Promise<void>;
  resetNotes: () => void;
}): (event: FormEvent<HTMLFormElement>) => Promise<void> {
  return async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!resolvedEntityId || !resolvedSceneId) {
      return;
    }

    try {
      await onSave({
        projectId,
        entityId: resolvedEntityId,
        sceneId: resolvedSceneId,
        notes: state.notes,
      });
      resetNotes();
    } catch {
      // Keep notes so users can retry after a failed save.
    }
  };
}

export function useSceneLinksEditorState(input: SceneLinksEditorStateInput): SceneLinksEditorState {
  const { projectId, entities, scenes, sceneLinks, selectedEntityId, onSave } = input;
  const formState = useSceneLinkFormState();
  const { entityId, sceneId } = formState.state;
  const entitiesById = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities]);
  const scenesById = useMemo(() => new Map(scenes.map((scene) => [scene.id, scene])), [scenes]);
  const visibleSceneLinks = useMemo(
    () => getVisibleSceneLinks(sceneLinks, selectedEntityId),
    [sceneLinks, selectedEntityId],
  );
  const resolvedEntityId = useMemo(
    () => resolveIdInList(entityId, entities, selectedEntityId),
    [entities, entityId, selectedEntityId],
  );
  const resolvedSceneId = useMemo(() => resolveIdInList(sceneId, scenes), [sceneId, scenes]);
  const handleSubmit = createSubmitHandler({
    projectId,
    state: formState.state,
    resolvedEntityId,
    resolvedSceneId,
    onSave,
    resetNotes: formState.resetNotes,
  });
  return {
    state: formState.state,
    entitiesById,
    scenesById,
    visibleSceneLinks,
    resolvedEntityId,
    resolvedSceneId,
    setEntityId: formState.setEntityId,
    setSceneId: formState.setSceneId,
    setNotes: formState.setNotes,
    handleSubmit,
  };
}
