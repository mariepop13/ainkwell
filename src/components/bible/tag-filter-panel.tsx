import type { ReactElement } from 'react';

interface TagFilterPanelProps {
  allTags: string[];
  activeTagFilter: string[];
  onTagFilterChange: (tags: string[]) => void;
}

function TagFilterChips({
  allTags,
  activeTagFilter,
  onToggle,
}: {
  allTags: string[];
  activeTagFilter: string[];
  onToggle: (tag: string) => void;
}): ReactElement {
  return (
    <div className="flex flex-wrap gap-1">
      {allTags.map((tag) => {
        const isActive = activeTagFilter.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            aria-pressed={isActive}
            className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

export function TagFilterPanel(
  { allTags, activeTagFilter, onTagFilterChange }: TagFilterPanelProps,
): ReactElement | null {
  if (allTags.length === 0) {
    return null;
  }

  const toggleTag = (tag: string): void => {
    if (activeTagFilter.includes(tag)) {
      onTagFilterChange(activeTagFilter.filter((activeTag) => activeTag !== tag));
    } else {
      onTagFilterChange([...activeTagFilter, tag]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Tags</p>
        {activeTagFilter.length > 0 ? (
          <button
            type="button"
            onClick={() => onTagFilterChange([])}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear tags
          </button>
        ) : null}
      </div>
      <TagFilterChips allTags={allTags} activeTagFilter={activeTagFilter} onToggle={toggleTag} />
    </div>
  );
}
