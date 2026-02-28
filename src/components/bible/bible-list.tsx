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

function BibleSearchField({
  searchValue,
  onSearchChange,
}: Pick<BibleListProps, 'searchValue' | 'onSearchChange'>): ReactElement {
  const onSearchInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(event.target.value);
  };

  return (
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
  );
}

function BibleCategoryField({
  categoryFilter,
  onCategoryFilterChange,
}: Pick<BibleListProps, 'categoryFilter' | 'onCategoryFilterChange'>): ReactElement {
  const onCategoryChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onCategoryFilterChange(handleCategoryValue(event.target.value));
  };

  return (
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
  );
}

function BibleListFilters({
  searchValue,
  categoryFilter,
  onSearchChange,
  onCategoryFilterChange,
}: Pick<BibleListProps, 'searchValue' | 'categoryFilter' | 'onSearchChange' | 'onCategoryFilterChange'>): ReactElement {
  return (
    <>
      <BibleSearchField searchValue={searchValue} onSearchChange={onSearchChange} />
      <BibleCategoryField
        categoryFilter={categoryFilter}
        onCategoryFilterChange={onCategoryFilterChange}
      />
    </>
  );
}

function BibleEntityItems({
  entities,
  selectedEntityId,
  onSelectEntity,
}: Pick<BibleListProps, 'entities' | 'selectedEntityId' | 'onSelectEntity'>): ReactElement {
  return (
    <>
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
    </>
  );
}

export function BibleList(props: BibleListProps): ReactElement {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 text-card-foreground">
      <BibleListFilters
        searchValue={props.searchValue}
        categoryFilter={props.categoryFilter}
        onSearchChange={props.onSearchChange}
        onCategoryFilterChange={props.onCategoryFilterChange}
      />
      <button
        type="button"
        className="w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        onClick={props.onCreateEntity}
      >
        New entity
      </button>
      <BibleEntityItems
        entities={props.entities}
        selectedEntityId={props.selectedEntityId}
        onSelectEntity={props.onSelectEntity}
      />
    </section>
  );
}
