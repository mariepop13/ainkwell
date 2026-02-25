'use client';

import { type FormEvent, type ReactElement, useMemo, useState } from 'react';
import type {
  BibleEntity,
  BibleRelationship,
  RelationshipType,
  SaveBibleRelationshipInput,
} from '@/domain/bible/types';
import { RELATIONSHIP_TYPES } from '@/domain/bible/types';

interface RelationshipEditorProps {
  projectId: string;
  entities: BibleEntity[];
  relationships: BibleRelationship[];
  selectedEntityId: string | null;
  errorMessage: string | null;
  onSave: (input: SaveBibleRelationshipInput) => void | Promise<void>;
  onDelete: (relationshipId: string) => void | Promise<void>;
}

export function RelationshipEditor({
  projectId,
  entities,
  relationships,
  selectedEntityId,
  errorMessage,
  onSave,
  onDelete,
}: RelationshipEditorProps): ReactElement {
  const [fromEntityId, setFromEntityId] = useState('');
  const [toEntityId, setToEntityId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('ally_of');
  const [notes, setNotes] = useState('');
  const entitiesById = useMemo(
    () => new Map(entities.map((entity) => [entity.id, entity])),
    [entities],
  );
  const entityIds = useMemo(() => new Set(entities.map((entity) => entity.id)), [entities]);
  const visibleRelationships = selectedEntityId
    ? relationships.filter(
        (relationship) =>
          relationship.fromEntityId === selectedEntityId || relationship.toEntityId === selectedEntityId,
      )
    : relationships;
  const resolvedFromEntityId = useMemo(() => {
    if (entityIds.has(fromEntityId)) {
      return fromEntityId;
    }
    return selectedEntityId ?? entities[0]?.id ?? '';
  }, [entities, entityIds, fromEntityId, selectedEntityId]);
  const resolvedToEntityId = useMemo(() => {
    if (entityIds.has(toEntityId) && toEntityId !== resolvedFromEntityId) {
      return toEntityId;
    }
    return entities.find((entity) => entity.id !== resolvedFromEntityId)?.id ?? resolvedFromEntityId;
  }, [entities, entityIds, resolvedFromEntityId, toEntityId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void onSave({
      projectId,
      type: relationshipType,
      fromEntityId: resolvedFromEntityId,
      toEntityId: resolvedToEntityId,
      notes,
    });
    setNotes('');
  };

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
      <h3 className="text-base font-bold">Relationships</h3>
      {errorMessage ? <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{errorMessage}</p> : null}
      <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="relationship-from-entity">
            From entity
          </label>
          <select
            id="relationship-from-entity"
            value={resolvedFromEntityId}
            onChange={(event) => setFromEntityId(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={entities.length === 0}
          >
            {entities.map((entity) => (
              <option value={entity.id} key={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="relationship-to-entity">
            To entity
          </label>
          <select
            id="relationship-to-entity"
            value={resolvedToEntityId}
            onChange={(event) => setToEntityId(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={entities.length === 0}
          >
            {entities.map((entity) => (
              <option value={entity.id} key={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="relationship-type">
            Type
          </label>
          <select
            id="relationship-type"
            value={relationshipType}
            onChange={(event) => setRelationshipType(event.target.value as RelationshipType)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {RELATIONSHIP_TYPES.map((typeOption) => (
              <option value={typeOption} key={typeOption}>
                {typeOption}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="relationship-notes">
            Notes
          </label>
          <input
            id="relationship-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={500}
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            disabled={entities.length < 2}
          >
            Save relationship
          </button>
        </div>
      </form>
      <ul className="space-y-2">
        {visibleRelationships.map((relationship) => {
          const fromEntity = entitiesById.get(relationship.fromEntityId);
          const toEntity = entitiesById.get(relationship.toEntityId);
          return (
            <li key={relationship.id} className="rounded-md border px-3 py-2">
              <p className="text-sm">
                <span className="font-semibold">{fromEntity?.name ?? relationship.fromEntityId}</span> {relationship.type}{' '}
                <span className="font-semibold">{toEntity?.name ?? relationship.toEntityId}</span>
              </p>
              {relationship.notes ? <p className="text-xs text-muted-foreground">{relationship.notes}</p> : null}
              <button
                type="button"
                onClick={() => void onDelete(relationship.id)}
                className="mt-2 text-xs font-semibold text-destructive"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
      {visibleRelationships.length === 0 ? (
        <p className="text-sm text-muted-foreground">No relationships found.</p>
      ) : null}
    </section>
  );
}
