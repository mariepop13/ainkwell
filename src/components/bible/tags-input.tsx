'use client';

import { type KeyboardEvent, type ReactElement, useState } from 'react';
import { TagChip } from '@/components/bible/tag-chip';

interface TagsInputProps {
  tags: string[];
  suggestedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const DATALIST_ID = 'tags-input-suggestions';

function ActiveTagList({
  tags,
  onRemove,
}: {
  tags: string[];
  onRemove: (tag: string) => void;
}): ReactElement | null {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <TagChip key={tag} label={tag} onRemove={() => onRemove(tag)} />
      ))}
    </div>
  );
}

function TagSuggestions({
  suggestedTags,
  activeTags,
}: {
  suggestedTags: string[];
  activeTags: string[];
}): ReactElement {
  return (
    <datalist id={DATALIST_ID}>
      {suggestedTags
        .filter((tag) => !activeTags.includes(tag))
        .map((tag) => (
          <option key={tag} value={tag} />
        ))}
    </datalist>
  );
}

export function TagsInput({ tags, suggestedTags, onTagsChange }: TagsInputProps): ReactElement {
  const [pendingInput, setPendingInput] = useState('');

  const addTag = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
    }
    setPendingInput('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    addTag(pendingInput);
  };

  const removeTag = (tag: string): void => {
    onTagsChange(tags.filter((existingTag) => existingTag !== tag));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold" htmlFor="entity-tags">
        Tags
      </label>
      <ActiveTagList tags={tags} onRemove={removeTag} />
      <span id="tags-input-hint" className="sr-only">Press Enter or comma to add a tag</span>
      <input
        id="entity-tags"
        aria-describedby="tags-input-hint"
        value={pendingInput}
        onChange={(event) => setPendingInput(event.target.value)}
        onKeyDown={handleKeyDown}
        list={DATALIST_ID}
        placeholder="Add a tag and press Enter"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      <TagSuggestions suggestedTags={suggestedTags} activeTags={tags} />
    </div>
  );
}
