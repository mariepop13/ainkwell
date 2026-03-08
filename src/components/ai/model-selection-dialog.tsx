'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import type { AiSettingsService } from '@/application/ai/ai-settings-service';
import { ModelCard } from '@/components/ai/model-card';
import { useModelLoader } from '@/hooks/use-model-loader';

type ModelSelectionDialogProps = {
  service: AiSettingsService;
  selectedModel: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
};

export function ModelSelectionDialog({
  service,
  selectedModel,
  onSelect,
  onClose,
}: ModelSelectionDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState('');
  const { models, isLoading, error, load } = useModelLoader(service);

  useEffect(() => {
    dialogRef.current?.showModal();
    void load();
  }, [load]);

  const filtered = models.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSelect(modelId: string): void {
    onSelect(modelId);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="model-selection-title"
      className="w-full max-w-xl rounded-xl border bg-card p-0 shadow-lg backdrop:bg-black/50"
    >
      <div className="flex flex-col max-h-[80vh]">
        <div className="p-4 border-b space-y-3">
          <h2 id="model-selection-title" className="text-lg font-headline font-semibold">Select model</h2>
          <label htmlFor="model-search" className="sr-only">Search models</label>
          <input
            id="model-search"
            type="search"
            placeholder="Search models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border bg-background px-3 py-1.5 text-sm"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading models…</p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          ) : null}
          {!isLoading && !error && filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No models found.</p>
          ) : null}
          {!isLoading && !error
            ? filtered.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={model.id === selectedModel}
                  onSelect={handleSelect}
                />
              ))
            : null}
        </div>

        <div className="p-4 border-t flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
