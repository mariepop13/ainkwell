'use client';

import type { ReactElement } from 'react';

import type { WeeklySummary } from '@/domain/writing-session/types';

interface WeeklyChartProps {
  weekly: WeeklySummary;
  dailyGoal: number | null;
}

const SHORT_WEEKDAY_LABELS: Record<number, string> = { 0: 'Su', 1: 'Mo', 2: 'Tu', 3: 'We', 4: 'Th', 5: 'Fr', 6: 'Sa' };

function getShortWeekday(dateString: string): string {
  const dayOfWeek = new Date(`${dateString}T12:00:00`).getDay();
  return SHORT_WEEKDAY_LABELS[dayOfWeek] ?? '??';
}

export function WeeklyChart({ weekly, dailyGoal }: WeeklyChartProps): ReactElement {
  const maxWords = Math.max(...weekly.days.map((day) => day.wordsWritten), dailyGoal ?? 0, 1);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-headline font-semibold">This Week</h2>
        <span className="text-sm text-muted-foreground">
          {weekly.totalWordsThisWeek.toLocaleString()} words total
        </span>
      </div>
      <div className="flex items-end gap-1 h-24">
        {weekly.days.map((day) => {
          const heightPercent = Math.round((day.wordsWritten / maxWords) * 100);
          const isGoalMet = day.goalMet;
          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t transition-all ${isGoalMet ? 'bg-primary' : 'bg-secondary'}`}
                  style={{ height: `${heightPercent}%`, minHeight: day.wordsWritten > 0 ? '2px' : '0' }}
                  title={`${day.wordsWritten} words`}
                />
              </div>
              <span className="text-xs text-muted-foreground">{getShortWeekday(day.date)}</span>
            </div>
          );
        })}
      </div>
      {dailyGoal !== null ? (
        <p className="text-xs text-muted-foreground">Highlighted bars reached the {dailyGoal.toLocaleString()} word goal.</p>
      ) : null}
    </div>
  );
}
