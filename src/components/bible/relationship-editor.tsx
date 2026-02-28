'use client';

import { type FormEvent, type ReactElement, useMemo } from 'react';
import { useRelationshipEditorState } from '@/components/bible/relationship-editor-state';
import { RELATIONSHIP_TYPES } from '@/domain/bible/types';
import type {
  BibleEntity,
  BibleRelationship,
  RelationshipType,
  SaveBibleRelationshipInput,
} from '@/domain/bible/types';

interface RelationshipEditorProps {
  projectId: string;
  entities: BibleEntity[];
  relationships: BibleRelationship[];
  selectedEntityId: string | null;
  errorMessage: string | null;
  onSave: (input: SaveBibleRelationshipInput) => void | Promise<void>;
  onDelete: (relationshipId: string) => void | Promise<void>;
}

interface RelationshipFormProps {
  entities: BibleEntity[];
  resolvedFromEntityId: string;
  resolvedToEntityId: string;
  relationshipType: RelationshipType;
  notes: string;
  onFromEntityChange: (value: string) => void;
  onToEntityChange: (value: string) => void;
  onRelationshipTypeChange: (value: RelationshipType) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

interface RelationshipEditorSectionProps {
  entities: BibleEntity[];
  visibleRelationships: BibleRelationship[];
  resolvedFromEntityId: string;
  resolvedToEntityId: string;
  relationshipType: RelationshipType;
  notes: string;
  errorMessage: string | null;
  onFromEntityChange: (value: string) => void;
  onToEntityChange: (value: string) => void;
  onRelationshipTypeChange: (value: RelationshipType) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onDelete: (relationshipId: string) => void | Promise<void>;
}

function SectionError({ message }: { message: string | null }): ReactElement | null {
  if (!message) {
    return null;
  }

  return <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{message}</p>;
}

function EntitySelectField({
  id,
  label,
  value,
  entities,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  entities: BibleEntity[];
  disabled: boolean;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        disabled={disabled}
      >
        {entities.map((entity) => (
          <option value={entity.id} key={entity.id}>
            {entity.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function RelationshipTypeField({
  value,
  onChange,
}: {
  value: RelationshipType;
  onChange: (value: RelationshipType) => void;
}): ReactElement {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor="relationship-type">
        Type
      </label>
      <select
        id="relationship-type"
        value={value}
        onChange={(event) => onChange(event.target.value as RelationshipType)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        {RELATIONSHIP_TYPES.map((typeOption) => (
          <option value={typeOption} key={typeOption}>
            {typeOption}
          </option>
        ))}
      </select>
    </div>
  );
}

function RelationshipNotesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor="relationship-notes">
        Notes
      </label>
      <input
        id="relationship-notes"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        maxLength={500}
      />
    </div>
  );
}

function RelationshipForm({
  entities,
  resolvedFromEntityId,
  resolvedToEntityId,
  relationshipType,
  notes,
  onFromEntityChange,
  onToEntityChange,
  onRelationshipTypeChange,
  onNotesChange,
  onSubmit,
}: RelationshipFormProps): ReactElement {
  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
      <EntitySelectField
        id="relationship-from-entity"
        label="From entity"
        value={resolvedFromEntityId}
        entities={entities}
        disabled={entities.length === 0}
        onChange={onFromEntityChange}
      />
      <EntitySelectField
        id="relationship-to-entity"
        label="To entity"
        value={resolvedToEntityId}
        entities={entities}
        disabled={entities.length === 0}
        onChange={onToEntityChange}
      />
      <RelationshipTypeField value={relationshipType} onChange={onRelationshipTypeChange} />
      <RelationshipNotesField value={notes} onChange={onNotesChange} />
      <RelationshipSubmitButton disabled={entities.length < 2} />
    </form>
  );
}

function RelationshipSubmitButton({ disabled }: { disabled: boolean }): ReactElement {
  return (
    <div className="md:col-span-2">
      <button
        type="submit"
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        disabled={disabled}
      >
        Save relationship
      </button>
    </div>
  );
}

function RelationshipEditorSection({
  entities,
  visibleRelationships,
  resolvedFromEntityId,
  resolvedToEntityId,
  relationshipType,
  notes,
  errorMessage,
  onFromEntityChange,
  onToEntityChange,
  onRelationshipTypeChange,
  onNotesChange,
  onSubmit,
  onDelete,
}: RelationshipEditorSectionProps): ReactElement {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
      <h3 className="text-base font-bold">Relationships</h3>
      <SectionError message={errorMessage} />
      <RelationshipForm
        entities={entities}
        resolvedFromEntityId={resolvedFromEntityId}
        resolvedToEntityId={resolvedToEntityId}
        relationshipType={relationshipType}
        notes={notes}
        onFromEntityChange={onFromEntityChange}
        onToEntityChange={onToEntityChange}
        onRelationshipTypeChange={onRelationshipTypeChange}
        onNotesChange={onNotesChange}
        onSubmit={onSubmit}
      />
      <RelationshipList visibleRelationships={visibleRelationships} entities={entities} onDelete={onDelete} />
    </section>
  );
}

function RelationshipList({
  visibleRelationships,
  entities,
  onDelete,
}: {
  visibleRelationships: BibleRelationship[];
  entities: BibleEntity[];
  onDelete: (relationshipId: string) => void | Promise<void>;
}): ReactElement {
  const entitiesById = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities]);

  if (visibleRelationships.length === 0) {
    return <p className="text-sm text-muted-foreground">No relationships found.</p>;
  }

  return (
    <ul className="space-y-2">
      {visibleRelationships.map((relationship) => (
        <RelationshipListItem
          key={relationship.id}
          relationship={relationship}
          fromEntityName={entitiesById.get(relationship.fromEntityId)?.name ?? relationship.fromEntityId}
          toEntityName={entitiesById.get(relationship.toEntityId)?.name ?? relationship.toEntityId}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function RelationshipListItem({
  relationship,
  fromEntityName,
  toEntityName,
  onDelete,
}: {
  relationship: BibleRelationship;
  fromEntityName: string;
  toEntityName: string;
  onDelete: (relationshipId: string) => void | Promise<void>;
}): ReactElement {
  return (
    <li className="rounded-md border px-3 py-2">
      <p className="text-sm">
        <span className="font-semibold">{fromEntityName}</span> {relationship.type}{' '}
        <span className="font-semibold">{toEntityName}</span>
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
  const editorState = useRelationshipEditorState({
    projectId,
    entities,
    relationships,
    selectedEntityId,
    onSave,
  });

  return (
    <RelationshipEditorSection
      entities={entities}
      visibleRelationships={editorState.visibleRelationships}
      resolvedFromEntityId={editorState.resolvedFromEntityId}
      resolvedToEntityId={editorState.resolvedToEntityId}
      relationshipType={editorState.state.relationshipType}
      notes={editorState.state.notes}
      errorMessage={errorMessage}
      onFromEntityChange={editorState.setFromEntityId}
      onToEntityChange={editorState.setToEntityId}
      onRelationshipTypeChange={editorState.setRelationshipType}
      onNotesChange={editorState.setNotes}
      onSubmit={editorState.handleSubmit}
      onDelete={onDelete}
    />
  );
}
