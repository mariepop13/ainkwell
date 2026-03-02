'use client';

import { createContext, useContext, useEffect, useMemo, type ReactElement, type ReactNode } from 'react';

import { WritingSessionService } from '@/application/writing-session/writing-session-service';
import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';
import { useWritingSession, type UseWritingSessionResult } from '@/hooks/use-writing-session';

type WritingSessionTimerValue = Pick<UseWritingSessionResult, 'isRunning' | 'elapsedSeconds'>;
type WritingSessionActionsValue = Pick<
  UseWritingSessionResult,
  'startSession' | 'stopSession' | 'setDailyGoal' | 'onWordsSaved' | 'dashboard' | 'error'
>;

const WritingSessionTimerContext = createContext<WritingSessionTimerValue | null>(null);
const WritingSessionActionsContext = createContext<WritingSessionActionsValue | null>(null);

export function useWritingSessionTimer(): WritingSessionTimerValue | null {
  return useContext(WritingSessionTimerContext);
}

export function useWritingSessionActions(): WritingSessionActionsValue | null {
  return useContext(WritingSessionActionsContext);
}

export function WritingSessionProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}): ReactElement {
  const repository = useMemo(() => new LocalWritingSessionRepository(), []);
  const service = useMemo(() => new WritingSessionService(repository), [repository]);
  const session = useWritingSession({ projectId, service });
  const { stopSession } = session;

  useEffect(() => {
    return () => {
      void stopSession();
    };
  }, [stopSession]);

  const timerValue = useMemo(
    () => ({ isRunning: session.isRunning, elapsedSeconds: session.elapsedSeconds }),
    [session.isRunning, session.elapsedSeconds],
  );

  const actionsValue = useMemo(
    () => ({
      startSession: session.startSession,
      stopSession: session.stopSession,
      setDailyGoal: session.setDailyGoal,
      onWordsSaved: session.onWordsSaved,
      dashboard: session.dashboard,
      error: session.error,
    }),
    [
      session.startSession,
      session.stopSession,
      session.setDailyGoal,
      session.onWordsSaved,
      session.dashboard,
      session.error,
    ],
  );

  return (
    <WritingSessionTimerContext.Provider value={timerValue}>
      <WritingSessionActionsContext.Provider value={actionsValue}>
        {children}
      </WritingSessionActionsContext.Provider>
    </WritingSessionTimerContext.Provider>
  );
}
