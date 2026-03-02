'use client';

import { useState } from 'react';
import type { ReactElement } from 'react';

import type { BeatType, SceneBeat } from '@/domain/scene/schemas';

type Props = {
  synopsis: string;
  beats: SceneBeat[];
  onSynopsisChange: (value: string) => void;
  onBeatsChange: (beats: SceneBeat[]) => void;
};

const BEAT_LABELS: Record<BeatType, string> = {
  setup: 'Setup',
  conflict: 'Conflict',
  resolution: 'Resolution',
  action: 'Action',
  dialogue: 'Dialogue',
  revelation: 'Revelation',
};

export function SceneBeatPanel({ synopsis, beats, onSynopsisChange, onBeatsChange }: Props): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  function addBeat(): void {
    onBeatsChange([...beats, { id: crypto.randomUUID(), content: '', type: 'setup' }]);
  }

  function updateBeat(id: string, changes: Partial<SceneBeat>): void {
    onBeatsChange(beats.map((beat) => (beat.id === id ? { ...beat, ...changes } : beat)));
  }

  function removeBeat(id: string): void {
    onBeatsChange(beats.filter((beat) => beat.id !== id));
  }

  return (
    <div className="border-b border-border bg-card">
      <button
        className="flex w-full items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span>Scene Plan</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="space-y-3 px-4 pb-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Synopsis</label>
            <input
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
              <button className="text-xs text-primary hover:underline" onClick={addBeat} type="button">
                + Add beat
              </button>
            </div>
            <ol className="space-y-2">
              {beats.map((beat) => (
                <li className="flex items-start gap-2" key={beat.id}>
                  <select
                    className="rounded border border-border bg-background px-1 py-1 text-xs"
                    onChange={(event) => updateBeat(beat.id, { type: event.target.value as BeatType })}
                    value={beat.type}
                  >
                    {Object.entries(BEAT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <input
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    maxLength={200}
                    onChange={(event) => updateBeat(beat.id, { content: event.target.value })}
                    placeholder="Describe this beat…"
                    type="text"
                    value={beat.content}
                  />
                  <button
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
}
