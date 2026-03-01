'use client';

import type { ReactElement } from 'react';

import type { DailyProgress as DailyProgressType } from '@/domain/writing-session/types';

interface DailyProgressProps {
  progress: DailyProgressType;
  dailyGoal: number | null;
}

export function DailyProgress({ progress, dailyGoal }: DailyProgressProps): ReactElement {
  const percentage =
    dailyGoal !== null && dailyGoal > 0 ? Math.min(100, Math.round((progress.wordsWritten / dailyGoal) * 100)) : 0;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-headline font-semibold">Today&apos;s Progress</h2>
        {progress.goalMet ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
            Goal met!
          </span>
        ) : null}
      </div>
      <p className="text-2xl font-bold tabular-nums">
        {progress.wordsWritten.toLocaleString()}
        {dailyGoal !== null ? (
          <span className="text-base font-normal text-muted-foreground"> / {dailyGoal.toLocaleString()} words</span>
        ) : (
          <span className="text-base font-normal text-muted-foreground"> words</span>
        )}
      </p>
      {dailyGoal !== null && dailyGoal > 0 ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={progress.wordsWritten}
            aria-valuemin={0}
            aria-valuemax={dailyGoal}
          />
        </div>
      ) : null}
      {dailyGoal === null ? (
        <p className="text-sm text-muted-foreground">Set a daily goal to track your progress.</p>
      ) : null}
    </div>
  );
}
