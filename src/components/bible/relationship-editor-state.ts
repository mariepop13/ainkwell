'use client';

import { type FormEvent, useMemo, useState } from 'react';
import type {
  BibleEntity,
  BibleRelationship,
  RelationshipType,
  SaveBibleRelationshipInput,
} from '@/domain/bible/types';

interface RelationshipFormState {
  fromEntityId: string;
  toEntityId: string;
  relationshipType: RelationshipType;
  notes: string;
}

interface RelationshipFormStateActions {
  state: RelationshipFormState;
  setFromEntityId: (value: string) => void;
  setToEntityId: (value: string) => void;
  setRelationshipType: (value: RelationshipType) => void;
  setNotes: (value: string) => void;
  resetNotes: () => void;
}

interface RelationshipEditorStateInput {
  projectId: string;
  entities: BibleEntity[];
  relationships: BibleRelationship[];
  selectedEntityId: string | null;
  onSave: (input: SaveBibleRelationshipInput) => void | Promise<void>;
}

export interface RelationshipEditorState {
  state: RelationshipFormState;
  visibleRelationships: BibleRelationship[];
  resolvedFromEntityId: string;
  resolvedToEntityId: string;
  setFromEntityId: (value: string) => void;
  setToEntityId: (value: string) => void;
  setRelationshipType: (value: RelationshipType) => void;
  setNotes: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function useRelationshipFormState(): RelationshipFormStateActions {
  const [fromEntityId, setFromEntityId] = useState('');
  const [toEntityId, setToEntityId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('ally_of');
  const [notes, setNotes] = useState('');

  return {
    state: { fromEntityId, toEntityId, relationshipType, notes },
    setFromEntityId,
    setToEntityId,
    setRelationshipType,
    setNotes,
    resetNotes: () => setNotes(''),
  };
}

function getVisibleRelationships(
  relationships: BibleRelationship[],
  selectedEntityId: string | null,
): BibleRelationship[] {
  if (!selectedEntityId) {
    return relationships;
  }

  return relationships.filter(
    (relationship) =>
      relationship.fromEntityId === selectedEntityId || relationship.toEntityId === selectedEntityId,
  );
}

function resolveFromEntityId(
  candidateFromEntityId: string,
  selectedEntityId: string | null,
  entities: BibleEntity[],
): string {
  const entityIds = new Set(entities.map((entity) => entity.id));
  if (entityIds.has(candidateFromEntityId)) {
    return candidateFromEntityId;
  }

  return selectedEntityId ?? entities[0]?.id ?? '';
}

function resolveToEntityId(
  candidateToEntityId: string,
  fromEntityId: string,
  entities: BibleEntity[],
): string {
  const entityIds = new Set(entities.map((entity) => entity.id));
  if (entityIds.has(candidateToEntityId) && candidateToEntityId !== fromEntityId) {
    return candidateToEntityId;
  }

  return entities.find((entity) => entity.id !== fromEntityId)?.id ?? fromEntityId;
}

function createSubmitHandler({
  projectId,
  state,
  resolvedFromEntityId,
  resolvedToEntityId,
  onSave,
  resetNotes,
}: {
  projectId: string;
  state: RelationshipFormState;
  resolvedFromEntityId: string;
  resolvedToEntityId: string;
  onSave: (input: SaveBibleRelationshipInput) => void | Promise<void>;
  resetNotes: () => void;
}): (event: FormEvent<HTMLFormElement>) => void {
  return (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void onSave({
      projectId,
      type: state.relationshipType,
      fromEntityId: resolvedFromEntityId,
      toEntityId: resolvedToEntityId,
      notes: state.notes,
    });
    resetNotes();
  };
}

export function useRelationshipEditorState({
  projectId,
  entities,
  relationships,
  selectedEntityId,
  onSave,
}: RelationshipEditorStateInput): RelationshipEditorState {
  const formState = useRelationshipFormState();
  const visibleRelationships = useMemo(
    () => getVisibleRelationships(relationships, selectedEntityId),
    [relationships, selectedEntityId],
  );
  const resolvedFromEntityId = useMemo(
    () => resolveFromEntityId(formState.state.fromEntityId, selectedEntityId, entities),
    [entities, formState.state.fromEntityId, selectedEntityId],
  );
  const resolvedToEntityId = useMemo(
    () => resolveToEntityId(formState.state.toEntityId, resolvedFromEntityId, entities),
    [entities, formState.state.toEntityId, resolvedFromEntityId],
  );
  const handleSubmit = createSubmitHandler({
    projectId,
    state: formState.state,
    resolvedFromEntityId,
    resolvedToEntityId,
    onSave,
    resetNotes: formState.resetNotes,
  });

  return {
    state: formState.state,
    visibleRelationships,
    resolvedFromEntityId,
    resolvedToEntityId,
    setFromEntityId: formState.setFromEntityId,
    setToEntityId: formState.setToEntityId,
    setRelationshipType: formState.setRelationshipType,
    setNotes: formState.setNotes,
    handleSubmit,
  };
}
