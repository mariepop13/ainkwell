import { beforeEach, describe, expect, it } from 'vitest';

import { LocalWritingSessionRepository, WRITING_SESSION_STORAGE_KEY } from '@/data/writing-session/local-writing-session-repository';
import type { WritingSession } from '@/domain/writing-session/types';

const PROJECT_A = '8b5d05ea-3f90-4fd4-91cb-c18edfd3de71';
const PROJECT_B = '6a7c61fb-5f70-47d5-aac9-f1f466f13de4';

function createRepository(): LocalWritingSessionRepository {
  return new LocalWritingSessionRepository(window.localStorage);
}

function buildSession(overrides: Partial<WritingSession> = {}): WritingSession {
  return {
    id: 'session-1',
    projectId: PROJECT_A,
    startedAt: '2024-01-15T10:00:00.000Z',
    endedAt: '2024-01-15T10:30:00.000Z',
    durationSeconds: 1800,
    wordsWritten: 250,
    ...overrides,
  };
}

describe('LocalWritingSessionRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns empty project data when storage is empty', () => {
    const repository = createRepository();
    const data = repository.getProjectData(PROJECT_A);

    expect(data.dailyGoal).toBeNull();
    expect(data.sessions).toHaveLength(0);
  });

  it('saves a session to the correct localStorage key', () => {
    const repository = createRepository();
    const session = buildSession();
    repository.saveSession(session);

    const raw = window.localStorage.getItem(WRITING_SESSION_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(raw).toContain('session-1');
  });

  it('upserts a session with the same id leaving only one record', () => {
    const repository = createRepository();
    const session = buildSession({ wordsWritten: 100 });
    repository.saveSession(session);
    repository.saveSession({ ...session, wordsWritten: 200 });

    const sessions = repository.listSessions(PROJECT_A);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].wordsWritten).toBe(200);
  });

  it('sets daily goal without clobbering sessions', () => {
    const repository = createRepository();
    repository.saveSession(buildSession());
    repository.setDailyGoal({ projectId: PROJECT_A, goal: 500 });

    const data = repository.getProjectData(PROJECT_A);
    expect(data.dailyGoal).toBe(500);
    expect(data.sessions).toHaveLength(1);
  });

  it('falls back to empty data when storage contains invalid JSON', () => {
    window.localStorage.setItem(WRITING_SESSION_STORAGE_KEY, 'not-json');
    const repository = createRepository();
    const data = repository.getProjectData(PROJECT_A);

    expect(data.dailyGoal).toBeNull();
    expect(data.sessions).toHaveLength(0);
  });

  it('isolates data between multiple projects', () => {
    const repository = createRepository();
    repository.saveSession(buildSession({ id: 'a1', projectId: PROJECT_A }));
    repository.saveSession(buildSession({ id: 'b1', projectId: PROJECT_B }));

    expect(repository.listSessions(PROJECT_A)).toHaveLength(1);
    expect(repository.listSessions(PROJECT_B)).toHaveLength(1);
    expect(repository.listSessions(PROJECT_A)[0].id).toBe('a1');
    expect(repository.listSessions(PROJECT_B)[0].id).toBe('b1');
  });
});
