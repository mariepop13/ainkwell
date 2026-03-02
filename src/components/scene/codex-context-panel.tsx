'use client';
import type { ReactElement } from 'react';
import { useState } from 'react';
import type { BibleEntity } from '@/domain/bible/types';

const CATEGORY_LABELS: Record<BibleEntity['category'], string> = {
  character: 'Character', location: 'Location', faction: 'Faction', lore: 'Lore',
};

const CATEGORY_COLORS: Record<BibleEntity['category'], string> = {
  character: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  location: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  faction: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  lore: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

type Props = { entities: BibleEntity[] };

export function CodexContextPanel({ entities }: Props): ReactElement {
  const [isOpen, setIsOpen] = useState(true);

  if (entities.length === 0) return <></>;

  return (
    <div className="w-64 shrink-0 border-l border-border bg-card">
      <button
        aria-controls="codex-panel-content"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-foreground"
        onClick={() => setIsOpen((v) => !v)}
        type="button"
      >
        <span>Codex ({entities.length})</span>
        <span aria-hidden="true" className="text-muted-foreground">{isOpen ? '▶' : '◀'}</span>
      </button>
      {isOpen && (
        <div className="space-y-2 overflow-y-auto px-3 pb-4" id="codex-panel-content" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {entities.map((entity) => (
            <div className="rounded-md border border-border bg-background p-2" key={entity.id}>
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[entity.category]}`}>
                  {CATEGORY_LABELS[entity.category]}
                </span>
                <span className="text-sm font-medium text-foreground">{entity.name}</span>
              </div>
              {entity.summary && (
                <p className="text-xs text-muted-foreground line-clamp-3">{entity.summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
