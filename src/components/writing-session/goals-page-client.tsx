'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';
import { useMemo } from 'react';

import { WritingSessionService } from '@/application/writing-session/writing-session-service';
import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';
import { useWritingSession } from '@/hooks/use-writing-session';

import { DailyGoalForm } from './daily-goal-form';
import { DailyProgress } from './daily-progress';
import { SessionHistory } from './session-history';
import { SessionTimer } from './session-timer';
import { WeeklyChart } from './weekly-chart';
import type { SessionDashboard } from '@/domain/writing-session/types';

interface GoalsPageClientProps {
  projectId: string;
  projectTitle: string;
}

function GoalsPageHeader({ projectId, projectTitle }: { projectId: string; projectTitle: string }): ReactElement {
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Link href="/workspace" className="hover:underline">Workspace</Link>
        <span>/</span>
        <Link href={`/workspace/${projectId}`} className="hover:underline">{projectTitle}</Link>
        <span>/</span>
        <span>Writing Goals</span>
      </div>
      <h1 className="text-3xl font-headline font-bold">Writing Goals</h1>
    </header>
  );
}

interface StreakSectionProps { currentStreak: number; longestStreak: number }

function StreakSection({ currentStreak, longestStreak }: StreakSectionProps): ReactElement {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <h2 className="text-lg font-headline font-semibold">Streak</h2>
      {currentStreak === 0 ? (
        <p className="text-sm text-muted-foreground">No active streak. Write today to start one!</p>
      ) : (
        <p className="text-2xl font-bold">
          {currentStreak}
          <span className="text-base font-normal text-muted-foreground"> day streak</span>
        </p>
      )}
      {longestStreak > 0 ? (
        <p className="text-sm text-muted-foreground">
          Longest streak: {longestStreak} day{longestStreak === 1 ? '' : 's'}
        </p>
      ) : null}
    </div>
  );
}

function DashboardPanels({ dashboard }: { dashboard: SessionDashboard }): ReactElement {
  return (
    <>
      <DailyProgress progress={dashboard.todayProgress} dailyGoal={dashboard.dailyGoal} />
      <StreakSection currentStreak={dashboard.streak.currentStreak} longestStreak={dashboard.streak.longestStreak} />
      <WeeklyChart weekly={dashboard.weekly} dailyGoal={dashboard.dailyGoal} />
      <SessionHistory sessions={dashboard.recentSessions} />
    </>
  );
}

export function GoalsPageClient({ projectId, projectTitle }: GoalsPageClientProps): ReactElement {
  const repository = useMemo(() => new LocalWritingSessionRepository(), []);
  const service = useMemo(() => new WritingSessionService(repository), [repository]);
  const { dashboard, isRunning, elapsedSeconds, error, startSession, stopSession, setDailyGoal } =
    useWritingSession({ projectId, service });

  const handleStop = async (): Promise<void> => {
    await stopSession();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <GoalsPageHeader projectId={projectId} projectTitle={projectTitle} />
      {error ? <p className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p> : null}
      <DailyGoalForm currentGoal={dashboard?.dailyGoal ?? null} onSave={setDailyGoal} />
      <SessionTimer isRunning={isRunning} elapsedSeconds={elapsedSeconds} onStart={startSession} onStop={handleStop} />
      {dashboard ? <DashboardPanels dashboard={dashboard} /> : (
        <div className="flex items-center justify-center py-10">
          <p className="text-sm text-muted-foreground">Loading writing goals...</p>
        </div>
      )}
      <Link className="text-sm font-medium text-primary underline" href={`/workspace/${projectId}`}>
        Back to project
      </Link>
    </main>
  );
}
