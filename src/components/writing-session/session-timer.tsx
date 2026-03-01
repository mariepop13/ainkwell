'use client';

import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

interface SessionTimerProps {
  isRunning: boolean;
  elapsedSeconds: number;
  onStart: () => void;
  onStop: () => Promise<void>;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, '0')).join(':');
}

export function SessionTimer({ isRunning, elapsedSeconds, onStart, onStop }: SessionTimerProps): ReactElement {
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleStop = async (): Promise<void> => {
    setIsStopping(true);
    try {
      await onStop();
    } finally {
      if (isMountedRef.current) {
        setIsStopping(false);
      }
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-headline font-semibold">Writing Session</h2>
      <div className="flex items-center gap-4">
        <span className="font-mono text-3xl tabular-nums">{formatDuration(elapsedSeconds)}</span>
        {isRunning ? (
          <button
            type="button"
            onClick={() => { void handleStop(); }}
            disabled={isStopping}
            className="inline-flex rounded-md border bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStopping ? 'Stopping...' : 'Stop session'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Start session
          </button>
        )}
      </div>
    </div>
  );
}
