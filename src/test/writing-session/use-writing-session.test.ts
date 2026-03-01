import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WritingSessionService } from '@/application/writing-session/writing-session-service';
import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';
import { useWritingSession } from '@/hooks/use-writing-session';

const PROJECT_A = '8b5d05ea-3f90-4fd4-91cb-c18edfd3de71';

function createService(): WritingSessionService {
  const repository = new LocalWritingSessionRepository(window.localStorage);
  return new WritingSessionService(repository);
}

describe('useWritingSession', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle state with dashboard loaded on mount', () => {
    const service = createService();
    const { result } = renderHook(() => useWritingSession({ projectId: PROJECT_A, service }));

    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.dashboard).not.toBeNull();
  });

  it('sets isRunning to true after startSession', () => {
    const service = createService();
    const { result } = renderHook(() => useWritingSession({ projectId: PROJECT_A, service }));

    act(() => {
      result.current.startSession();
    });

    expect(result.current.isRunning).toBe(true);
  });

  it('increments elapsedSeconds via timer tick', () => {
    const service = createService();
    const { result } = renderHook(() => useWritingSession({ projectId: PROJECT_A, service }));

    act(() => {
      result.current.startSession();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedSeconds).toBe(3);
  });

  it('stopSession clears interval and resets isRunning', async () => {
    const service = createService();
    const { result } = renderHook(() => useWritingSession({ projectId: PROJECT_A, service }));

    act(() => {
      result.current.startSession();
    });

    await act(async () => {
      await result.current.stopSession();
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it('clears timer on unmount during active session', () => {
    const service = createService();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { result, unmount } = renderHook(() => useWritingSession({ projectId: PROJECT_A, service }));

    act(() => {
      result.current.startSession();
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
