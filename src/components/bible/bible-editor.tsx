'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { BIBLE_ENTITY_CATEGORIES } from '@/domain/bible/types';
import type { BibleEntity, BibleEntityCategory, SaveBibleEntityInput } from '@/domain/bible/types';
import { TagsInput } from '@/components/bible/tags-input';

interface BibleEditorProps {
  projectId: string;
  selectedEntity: BibleEntity | null;
  errorMessage: string | null;
  suggestedTags?: string[];
  onSave: (input: SaveBibleEntityInput) => void | Promise<void>;
  onDelete: (entityId: string) => void | Promise<void>;
}

interface EntityFormState {
  category: BibleEntityCategory;
  name: string;
  summary: string;
  details: string;
  tags: string[];
}

interface EntityFormProps {
  state: EntityFormState;
  suggestedTags: string[];
  onCategoryChange: (value: BibleEntityCategory) => void;
  onNameChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
  onTagsChange: (value: string[]) => void;
}

interface EditorActionsHandlers {
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  handleDelete: () => void;
}

function getInitialFormState(selectedEntity: BibleEntity | null): EntityFormState {
  if (!selectedEntity) {
    return {
      category: 'character',
      name: '',
      summary: '',
      details: '',
      tags: [],
    };
  }

  return {
    category: selectedEntity.category,
    name: selectedEntity.name,
    summary: selectedEntity.summary,
    details: selectedEntity.details,
    tags: selectedEntity.tags,
  };
}

function useEntityFormState(selectedEntity: BibleEntity | null): {
  state: EntityFormState;
  setCategory: (value: BibleEntityCategory) => void;
  setName: (value: string) => void;
  setSummary: (value: string) => void;
  setDetails: (value: string) => void;
  setTags: (value: string[]) => void;
} {
  const initialFormState = getInitialFormState(selectedEntity);
  const [category, setCategory] = useState<BibleEntityCategory>(initialFormState.category);
  const [name, setName] = useState(initialFormState.name);
  const [summary, setSummary] = useState(initialFormState.summary);
  const [details, setDetails] = useState(initialFormState.details);
  const [tags, setTags] = useState<string[]>(initialFormState.tags);

  return {
    state: { category, name, summary, details, tags },
    setCategory,
    setName,
    setSummary,
    setDetails,
    setTags,
  };
}

function EditorHeader({ hasSelectedEntity }: { hasSelectedEntity: boolean }): ReactElement {
  return <h2 className="text-lg font-bold">{hasSelectedEntity ? 'Edit entity' : 'New entity'}</h2>;
}

function EditorError({ message }: { message: string | null }): ReactElement | null {
  if (!message) {
    return null;
  }

  return <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{message}</p>;
}

function EntityFormFields({
  state,
  suggestedTags,
  onCategoryChange,
  onNameChange,
  onSummaryChange,
  onDetailsChange,
  onTagsChange,
}: EntityFormProps): ReactElement {
  return (
    <>
      <NameField value={state.name} onChange={onNameChange} />
      <CategoryField value={state.category} onChange={onCategoryChange} />
      <SummaryField value={state.summary} onChange={onSummaryChange} />
      <DetailsField value={state.details} onChange={onDetailsChange} />
      <TagsInput tags={state.tags} suggestedTags={suggestedTags} onTagsChange={onTagsChange} />
    </>
  );
}

function NameField({ value, onChange }: { value: string; onChange: (value: string) => void }): ReactElement {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor="entity-name">
        Name
      </label>
      <input
        id="entity-name"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        required
        maxLength={120}
      />
    </div>
  );
}

function CategoryField({
  value,
  onChange,
}: {
  value: BibleEntityCategory;
  onChange: (value: BibleEntityCategory) => void;
}): ReactElement {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor="entity-category">
        Category
      </label>
      <select
        id="entity-category"
        value={value}
        onChange={(event) => onChange(event.target.value as BibleEntityCategory)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        {BIBLE_ENTITY_CATEGORIES.map((categoryOption) => (
          <option value={categoryOption} key={categoryOption}>
            {categoryOption}
          </option>
        ))}
      </select>
    </div>
  );
}

function SummaryField({ value, onChange }: { value: string; onChange: (value: string) => void }): ReactElement {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor="entity-summary">
        Summary
      </label>
      <textarea
        id="entity-summary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
        maxLength={280}
      />
    </div>
  );
}

function DetailsField({ value, onChange }: { value: string; onChange: (value: string) => void }): ReactElement {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor="entity-details">
        Details
      </label>
      <textarea
        id="entity-details"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
        maxLength={5000}
      />
    </div>
  );
}

function EditorActions({
  selectedEntity,
  onDelete,
}: {
  selectedEntity: BibleEntity | null;
  onDelete: () => void;
}): ReactElement {
  return (
    <div className="flex gap-2">
      <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Save entity
      </button>
      {selectedEntity ? (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md border border-destructive px-4 py-2 text-sm font-semibold text-destructive"
        >
          Delete entity
        </button>
      ) : null}
    </div>
  );
}

function useEditorActions({
  projectId,
  selectedEntity,
  state,
  onSave,
  onDelete,
}: {
  projectId: string;
  selectedEntity: BibleEntity | null;
  state: EntityFormState;
  onSave: (input: SaveBibleEntityInput) => void | Promise<void>;
  onDelete: (entityId: string) => void | Promise<void>;
}): EditorActionsHandlers {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void onSave({
      projectId,
      entityId: selectedEntity?.id,
      category: state.category,
      name: state.name,
      summary: state.summary,
      details: state.details,
      tags: state.tags,
    });
  };

  const handleDelete = (): void => {
    if (!selectedEntity) {
      return;
    }
    void onDelete(selectedEntity.id);
  };

  return { handleSubmit, handleDelete };
}

export function BibleEditor({
  projectId,
  selectedEntity,
  errorMessage,
  suggestedTags = [],
  onSave,
  onDelete,
}: BibleEditorProps): ReactElement {
  const { state, setCategory, setName, setSummary, setDetails, setTags } = useEntityFormState(selectedEntity);
  const { handleSubmit, handleDelete } = useEditorActions({
    projectId,
    selectedEntity,
    state,
    onSave,
    onDelete,
  });

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
      <EditorHeader hasSelectedEntity={Boolean(selectedEntity)} />
      <EditorError message={errorMessage} />
      <form className="space-y-3" onSubmit={handleSubmit}>
        <EntityFormFields
          state={state}
          suggestedTags={suggestedTags}
          onCategoryChange={setCategory}
          onNameChange={setName}
          onSummaryChange={setSummary}
          onDetailsChange={setDetails}
          onTagsChange={setTags}
        />
        <EditorActions selectedEntity={selectedEntity} onDelete={handleDelete} />
      </form>
    </section>
  );
}
