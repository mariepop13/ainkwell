'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import type { BibleEntity, BibleEntityCategory, SaveBibleEntityInput } from '@/domain/bible/types';
import { BIBLE_ENTITY_CATEGORIES } from '@/domain/bible/types';

interface BibleEditorProps {
  projectId: string;
  selectedEntity: BibleEntity | null;
  errorMessage: string | null;
  onSave: (input: SaveBibleEntityInput) => void | Promise<void>;
  onDelete: (entityId: string) => void | Promise<void>;
}

function toTagInputValue(tags: string[]): string {
  return tags.join(', ');
}

function parseTagInputValue(value: string): string[] {
  const tags = value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  return Array.from(new Set(tags));
}

interface EntityFormState {
  category: BibleEntityCategory;
  name: string;
  summary: string;
  details: string;
  tagsInputValue: string;
}

function getInitialFormState(selectedEntity: BibleEntity | null): EntityFormState {
  if (!selectedEntity) {
    return {
      category: 'character',
      name: '',
      summary: '',
      details: '',
      tagsInputValue: '',
    };
  }

  return {
    category: selectedEntity.category,
    name: selectedEntity.name,
    summary: selectedEntity.summary,
    details: selectedEntity.details,
    tagsInputValue: toTagInputValue(selectedEntity.tags),
  };
}

export function BibleEditor({
  projectId,
  selectedEntity,
  errorMessage,
  onSave,
  onDelete,
}: BibleEditorProps): ReactElement {
  const initialFormState = getInitialFormState(selectedEntity);
  const [category, setCategory] = useState<BibleEntityCategory>(initialFormState.category);
  const [name, setName] = useState(initialFormState.name);
  const [summary, setSummary] = useState(initialFormState.summary);
  const [details, setDetails] = useState(initialFormState.details);
  const [tagsInputValue, setTagsInputValue] = useState(initialFormState.tagsInputValue);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void onSave({
      projectId,
      entityId: selectedEntity?.id,
      category,
      name,
      summary,
      details,
      tags: parseTagInputValue(tagsInputValue),
    });
  };

  const handleDelete = (): void => {
    if (!selectedEntity) {
      return;
    }
    void onDelete(selectedEntity.id);
  };

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
      <h2 className="text-lg font-bold">{selectedEntity ? 'Edit entity' : 'New entity'}</h2>
      {errorMessage ? <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{errorMessage}</p> : null}
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="entity-name">
            Name
          </label>
          <input
            id="entity-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            required
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="entity-category">
            Category
          </label>
          <select
            id="entity-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as BibleEntityCategory)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {BIBLE_ENTITY_CATEGORIES.map((categoryOption) => (
              <option value={categoryOption} key={categoryOption}>
                {categoryOption}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="entity-summary">
            Summary
          </label>
          <textarea
            id="entity-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={280}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="entity-details">
            Details
          </label>
          <textarea
            id="entity-details"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
            maxLength={5000}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="entity-tags">
            Tags
          </label>
          <input
            id="entity-tags"
            value={tagsInputValue}
            onChange={(event) => setTagsInputValue(event.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="comma, separated, tags"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Save entity
          </button>
          {selectedEntity ? (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-destructive px-4 py-2 text-sm font-semibold text-destructive"
            >
              Delete entity
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
