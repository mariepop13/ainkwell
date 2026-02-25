import type { ChangeEvent, ReactElement } from 'react';
import type { BibleEntity, BibleEntityCategory } from '@/domain/bible/types';
import { BIBLE_ENTITY_CATEGORIES } from '@/domain/bible/types';

interface BibleListProps {
  entities: BibleEntity[];
  selectedEntityId: string | null;
  searchValue: string;
  categoryFilter: BibleEntityCategory | 'all';
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: BibleEntityCategory | 'all') => void;
  onSelectEntity: (entityId: string) => void;
  onCreateEntity: () => void;
}

function handleCategoryValue(value: string): BibleEntityCategory | 'all' {
  if (value === 'all') {
    return 'all';
  }
  if (BIBLE_ENTITY_CATEGORIES.includes(value as BibleEntityCategory)) {
    return value as BibleEntityCategory;
  }
  return 'all';
}

export function BibleList({
  entities,
  selectedEntityId,
  searchValue,
  categoryFilter,
  onSearchChange,
  onCategoryFilterChange,
  onSelectEntity,
  onCreateEntity,
}: BibleListProps): ReactElement {
  const onSearchInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(event.target.value);
  };

  const onCategoryChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onCategoryFilterChange(handleCategoryValue(event.target.value));
  };

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="bible-search">
          Search
        </label>
        <input
          id="bible-search"
          value={searchValue}
          onChange={onSearchInputChange}
          placeholder="Search entities"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="bible-category-filter">
          Category
        </label>
        <select
          id="bible-category-filter"
          value={categoryFilter}
          onChange={onCategoryChange}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          {BIBLE_ENTITY_CATEGORIES.map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        onClick={onCreateEntity}
      >
        New entity
      </button>
      <ul className="space-y-2">
        {entities.map((entity) => (
          <li key={entity.id}>
            <button
              type="button"
              onClick={() => onSelectEntity(entity.id)}
              className={`w-full rounded-md border px-3 py-2 text-left ${
                selectedEntityId === entity.id ? 'border-primary' : 'border-border'
              }`}
            >
              <p className="font-semibold">{entity.name}</p>
              <p className="text-xs text-muted-foreground">{entity.category}</p>
            </button>
          </li>
        ))}
      </ul>
      {entities.length === 0 ? <p className="text-sm text-muted-foreground">No entities found.</p> : null}
    </section>
  );
}
