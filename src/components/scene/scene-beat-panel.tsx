'use client';

import { memo, useCallback, useState } from 'react';
import type { ReactElement } from 'react';

import type { BeatType, SceneBeat } from '@/domain/scene/schemas';

type Props = {
  synopsis: string;
  beats: SceneBeat[];
  onSynopsisChange: (value: string) => void;
  onBeatsChange: (beats: SceneBeat[]) => void;
};

const maxBeatsPerScene = 20;

const BEAT_LABELS: Record<BeatType, string> = {
  setup: 'Setup',
  conflict: 'Conflict',
  resolution: 'Resolution',
  action: 'Action',
  dialogue: 'Dialogue',
  revelation: 'Revelation',
};

export const SceneBeatPanel = memo(function SceneBeatPanel({ synopsis, beats, onSynopsisChange, onBeatsChange }: Props): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  const addBeat = useCallback((): void => {
    if (beats.length >= maxBeatsPerScene) return;
    onBeatsChange([...beats, { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, content: '', type: 'setup' }]);
  }, [beats, onBeatsChange]);

  const updateBeat = useCallback((id: string, changes: Partial<SceneBeat>): void => {
    onBeatsChange(beats.map((beat) => (beat.id === id ? { ...beat, ...changes } : beat)));
  }, [beats, onBeatsChange]);

  const removeBeat = useCallback((id: string): void => {
    onBeatsChange(beats.filter((beat) => beat.id !== id));
  }, [beats, onBeatsChange]);

  return (
    <div className="border-b border-border bg-card">
      <button
        aria-controls="scene-plan-panel"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span>Scene Plan</span>
        <span aria-hidden>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="space-y-3 px-4 pb-4" id="scene-plan-panel">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="beat-synopsis">Synopsis</label>
            <input
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              id="beat-synopsis"
              maxLength={300}
              onChange={(event) => onSynopsisChange(event.target.value)}
              placeholder="What happens in this scene?"
              type="text"
              value={synopsis}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Beats</label>
              <button
                className="text-xs text-primary hover:underline disabled:opacity-50"
                disabled={beats.length >= maxBeatsPerScene}
                onClick={addBeat}
                type="button"
              >
                + Add beat
              </button>
            </div>
            <ol className="space-y-2">
              {beats.map((beat, index) => (
                <li className="flex items-start gap-2" key={beat.id}>
                  <select
                    aria-label={`Beat ${index + 1} type`}
                    className="rounded border border-border bg-background px-1 py-1 text-xs"
                    onChange={(event) => updateBeat(beat.id, { type: event.target.value as BeatType })}
                    value={beat.type}
                  >
                    {Object.entries(BEAT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <input
                    aria-label={`Beat ${index + 1} content`}
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    maxLength={200}
                    onChange={(event) => updateBeat(beat.id, { content: event.target.value })}
                    placeholder="Describe this beat…"
                    type="text"
                    value={beat.content}
                  />
                  <button
                    aria-label={`Remove beat ${index + 1}`}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => removeBeat(beat.id)}
                    type="button"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
});
