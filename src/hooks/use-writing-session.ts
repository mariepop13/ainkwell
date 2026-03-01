import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { WritingSessionService } from '@/application/writing-session/writing-session-service';
import type { SessionDashboard } from '@/domain/writing-session/types';

import {
  applyDashboardLoaded,
  applySessionEnded,
  applySessionStarted,
  assignSessionRef,
  clearSessionInterval,
  incrementSessionRef,
  initialSessionViewState,
  type SessionRuntimeRefs,
  type SessionViewState,
  type SessionViewStateSetter,
} from './use-writing-session-runtime';

type UseWritingSessionInput = {
  projectId: string;
  service: WritingSessionService;
};

export type UseWritingSessionResult = {
  dashboard: SessionDashboard | null;
  isRunning: boolean;
  elapsedSeconds: number;
  error: string | null;
  startSession: () => void;
  stopSession: () => Promise<void>;
  setDailyGoal: (goal: number | null) => void;
  onWordsSaved: (delta: number) => void;
};

function useViewState(): { viewState: SessionViewState; patchViewState: SessionViewStateSetter } {
  const [viewState, setViewState] = useState<SessionViewState>(initialSessionViewState);
  const patchViewState = useCallback((patch: Partial<SessionViewState>): void => {
    setViewState((previousState) => ({ ...previousState, ...patch }));
  }, []);
  return { viewState, patchViewState };
}

function useRuntimeRefs(): SessionRuntimeRefs {
  const sessionIdRef = useRef<string | null>(null);
  const wordsDeltaRef = useRef<number>(0);
  const elapsedSecondsRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(false);
  return useMemo(() => ({ sessionIdRef, wordsDeltaRef, elapsedSecondsRef, intervalRef, isMountedRef }), []);
}

function useLoadDashboard(input: UseWritingSessionInput, patchViewState: SessionViewStateSetter): () => void {
  return useCallback((): void => {
    try {
      applyDashboardLoaded(patchViewState, input.service.getDashboard(input.projectId));
    } catch {
      patchViewState({ error: 'Failed to load writing goals data.' });
    }
  }, [input.projectId, input.service, patchViewState]);
}

function useStartStop(
  input: UseWritingSessionInput,
  runtimeRefs: SessionRuntimeRefs,
  patchViewState: SessionViewStateSetter,
): Pick<UseWritingSessionResult, 'startSession' | 'stopSession'> {
  const startSession = useCallback((): void => {
    try {
      const session = input.service.startSession({ projectId: input.projectId });
      assignSessionRef(runtimeRefs.sessionIdRef, session.id);
      assignSessionRef(runtimeRefs.wordsDeltaRef, 0);
      assignSessionRef(runtimeRefs.elapsedSecondsRef, 0);
      applySessionStarted(patchViewState);
      assignSessionRef(runtimeRefs.intervalRef, setInterval(() => {
        if (!runtimeRefs.isMountedRef.current) return;
        patchViewState({ elapsedSeconds: incrementSessionRef(runtimeRefs.elapsedSecondsRef) });
      }, 1000));
    } catch {
      patchViewState({ error: 'Failed to start writing session.' });
    }
  }, [input.projectId, input.service, patchViewState, runtimeRefs]);

  const stopSession = useCallback(async (): Promise<void> => {
    const sessionId = runtimeRefs.sessionIdRef.current;
    if (!sessionId) return;
    const wordsWritten = runtimeRefs.wordsDeltaRef.current;
    clearSessionInterval(runtimeRefs.intervalRef);
    assignSessionRef(runtimeRefs.sessionIdRef, null);
    assignSessionRef(runtimeRefs.wordsDeltaRef, 0);
    assignSessionRef(runtimeRefs.elapsedSecondsRef, 0);
    try {
      await Promise.resolve(input.service.endSession({ sessionId, projectId: input.projectId, wordsWritten }));
      applySessionEnded(patchViewState, input.service.getDashboard(input.projectId));
    } catch {
      patchViewState({ isRunning: false, elapsedSeconds: 0, error: 'Failed to save writing session.' });
    }
  }, [input.projectId, input.service, patchViewState, runtimeRefs]);

  return { startSession, stopSession };
}

function useGoalAndWords(
  input: UseWritingSessionInput,
  runtimeRefs: SessionRuntimeRefs,
  patchViewState: SessionViewStateSetter,
  loadDashboard: () => void,
): Pick<UseWritingSessionResult, 'setDailyGoal' | 'onWordsSaved'> {
  const setDailyGoal = useCallback((goal: number | null): void => {
    try {
      input.service.setDailyGoal({ projectId: input.projectId, goal });
      loadDashboard();
    } catch {
      patchViewState({ error: 'Failed to update daily goal.' });
    }
  }, [input.projectId, input.service, loadDashboard, patchViewState]);

  const onWordsSaved = useCallback((delta: number): void => {
    if (!runtimeRefs.sessionIdRef.current) return;
    assignSessionRef(runtimeRefs.wordsDeltaRef, runtimeRefs.wordsDeltaRef.current + delta);
  }, [runtimeRefs]);

  return { setDailyGoal, onWordsSaved };
}

export function useWritingSession(input: UseWritingSessionInput): UseWritingSessionResult {
  const runtimeRefs = useRuntimeRefs();
  const { viewState, patchViewState } = useViewState();
  const loadDashboard = useLoadDashboard(input, patchViewState);
  const { startSession, stopSession } = useStartStop(input, runtimeRefs, patchViewState);
  const { setDailyGoal, onWordsSaved } = useGoalAndWords(input, runtimeRefs, patchViewState, loadDashboard);

  useEffect(() => {
    assignSessionRef(runtimeRefs.isMountedRef, true);
    loadDashboard();
    return () => {
      assignSessionRef(runtimeRefs.isMountedRef, false);
      clearSessionInterval(runtimeRefs.intervalRef);
    };
  }, [loadDashboard, runtimeRefs]);

  return {
    dashboard: viewState.dashboard,
    isRunning: viewState.isRunning,
    elapsedSeconds: viewState.elapsedSeconds,
    error: viewState.error,
    startSession,
    stopSession,
    setDailyGoal,
    onWordsSaved,
  };
}
