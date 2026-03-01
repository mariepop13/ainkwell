import type { MutableRefObject } from 'react';

import type { SessionDashboard } from '@/domain/writing-session/types';

export type SessionViewState = {
  dashboard: SessionDashboard | null;
  isRunning: boolean;
  elapsedSeconds: number;
  error: string | null;
};

export type SessionRuntimeRefs = {
  sessionIdRef: MutableRefObject<string | null>;
  wordsDeltaRef: MutableRefObject<number>;
  elapsedSecondsRef: MutableRefObject<number>;
  intervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  isMountedRef: MutableRefObject<boolean>;
};

export type SessionViewStateSetter = (patch: Partial<SessionViewState>) => void;

export const initialSessionViewState: SessionViewState = {
  dashboard: null,
  isRunning: false,
  elapsedSeconds: 0,
  error: null,
};

export const assignSessionRef = <T>(ref: MutableRefObject<T>, value: T): void => {
  ref.current = value;
};

export const incrementSessionRef = (ref: MutableRefObject<number>): number => {
  ref.current += 1;
  return ref.current;
};

export const clearSessionInterval = (intervalRef: MutableRefObject<ReturnType<typeof setInterval> | null>): void => {
  if (!intervalRef.current) {
    return;
  }

  clearInterval(intervalRef.current);
  assignSessionRef(intervalRef, null);
};

export const applySessionStarted = (patchViewState: SessionViewStateSetter): void => {
  patchViewState({ isRunning: true, elapsedSeconds: 0, error: null });
};

export const applySessionEnded = (
  patchViewState: SessionViewStateSetter,
  dashboard: SessionDashboard,
): void => {
  patchViewState({ isRunning: false, elapsedSeconds: 0, dashboard, error: null });
};

export const applyDashboardLoaded = (
  patchViewState: SessionViewStateSetter,
  dashboard: SessionDashboard,
): void => {
  patchViewState({ dashboard });
};
