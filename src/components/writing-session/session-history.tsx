'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';

import type { WritingSession } from '@/domain/writing-session/types';

interface SessionHistoryProps {
  sessions: WritingSession[];
}

const INITIAL_DISPLAY_COUNT = 20;

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatSessionDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SessionRow({ session }: { session: WritingSession }): ReactElement {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3 text-sm">
      <span className="text-muted-foreground">{formatSessionDate(session.startedAt)}</span>
      <div className="flex gap-4">
        <span>{formatDuration(session.durationSeconds)}</span>
        <span className="font-medium">{session.wordsWritten.toLocaleString()} words</span>
      </div>
    </li>
  );
}

export function SessionHistory({ sessions }: SessionHistoryProps): ReactElement {
  const [showAll, setShowAll] = useState<boolean>(false);
  const displayedSessions = showAll ? sessions : sessions.slice(0, INITIAL_DISPLAY_COUNT);

  if (sessions.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border p-4">
        <h2 className="text-lg font-headline font-semibold">Session History</h2>
        <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-headline font-semibold">Session History</h2>
      <ul className="space-y-2">
        {displayedSessions.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </ul>
      {sessions.length > INITIAL_DISPLAY_COUNT && !showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-sm font-medium text-primary underline"
        >
          Show {sessions.length - INITIAL_DISPLAY_COUNT} more
        </button>
      ) : null}
    </div>
  );
}
