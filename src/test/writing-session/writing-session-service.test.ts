import { beforeEach, describe, expect, it } from 'vitest';

import { WritingSessionService, WritingSessionValidationError } from '@/application/writing-session/writing-session-service';
import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';

const PROJECT_A = '8b5d05ea-3f90-4fd4-91cb-c18edfd3de71';

function createService(nowProvider?: () => string): WritingSessionService {
  const repository = new LocalWritingSessionRepository(window.localStorage);
  return new WritingSessionService(repository, nowProvider);
}

describe('WritingSessionService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('setDailyGoal', () => {
    it('persists goal to storage', () => {
      const service = createService();
      service.setDailyGoal({ projectId: PROJECT_A, goal: 500 });
      const dashboard = service.getDashboard(PROJECT_A);
      expect(dashboard.dailyGoal).toBe(500);
    });

    it('accepts null to clear goal', () => {
      const service = createService();
      service.setDailyGoal({ projectId: PROJECT_A, goal: 500 });
      service.setDailyGoal({ projectId: PROJECT_A, goal: null });
      expect(service.getDashboard(PROJECT_A).dailyGoal).toBeNull();
    });

    it('rejects negative numbers', () => {
      const service = createService();
      expect(() => service.setDailyGoal({ projectId: PROJECT_A, goal: -1 })).toThrow();
    });
  });

  describe('startSession', () => {
    it('creates a session with correct initial state', () => {
      const now = '2024-01-15T10:00:00.000Z';
      const service = createService(() => now);
      const session = service.startSession({ projectId: PROJECT_A });

      expect(session.projectId).toBe(PROJECT_A);
      expect(session.startedAt).toBe(now);
      expect(session.durationSeconds).toBe(0);
      expect(session.wordsWritten).toBe(0);
      expect(session.id).toBeTruthy();
    });

    it('generates a unique UUID for each session', () => {
      const service = createService();
      const sessionA = service.startSession({ projectId: PROJECT_A });
      const sessionB = service.startSession({ projectId: PROJECT_A });
      expect(sessionA.id).not.toBe(sessionB.id);
    });
  });

  describe('endSession', () => {
    it('patches duration and wordsWritten on the existing session', () => {
      const startedAt = '2024-01-15T10:00:00.000Z';
      const endedAt = '2024-01-15T10:30:00.000Z';
      const service = createService(() => startedAt);
      const session = service.startSession({ projectId: PROJECT_A });

      const ended = service.endSession({ sessionId: session.id, projectId: PROJECT_A, endedAt, wordsWritten: 300 });

      expect(ended.durationSeconds).toBe(1800);
      expect(ended.wordsWritten).toBe(300);
      expect(ended.endedAt).toBe(endedAt);
    });

    it('throws when sessionId is not found', () => {
      const service = createService();
      expect(() =>
        service.endSession({ sessionId: 'nonexistent', projectId: PROJECT_A, wordsWritten: 0 }),
      ).toThrow(WritingSessionValidationError);
    });
  });

  describe('computeTodayProgress', () => {
    it('sums only today sessions', () => {
      const today = '2024-01-15T10:00:00.000Z';
      const yesterday = '2024-01-14T10:00:00.000Z';
      const service = createService(() => today);
      const s1 = service.startSession({ projectId: PROJECT_A });
      service.endSession({ sessionId: s1.id, projectId: PROJECT_A, wordsWritten: 200 });

      const oldService = createService(() => yesterday);
      const s2 = oldService.startSession({ projectId: PROJECT_A });
      oldService.endSession({ sessionId: s2.id, projectId: PROJECT_A, wordsWritten: 100 });

      const dashboard = service.getDashboard(PROJECT_A);
      expect(dashboard.todayProgress.wordsWritten).toBe(200);
    });

    it('returns zero when no sessions exist', () => {
      const service = createService();
      const dashboard = service.getDashboard(PROJECT_A);
      expect(dashboard.todayProgress.wordsWritten).toBe(0);
      expect(dashboard.todayProgress.goalMet).toBe(false);
    });
  });

  describe('computeStreak', () => {
    it('returns streak of 3 for 3 consecutive days', () => {
      const day3 = '2024-01-15T10:00:00.000Z';
      const day2 = '2024-01-14T10:00:00.000Z';
      const day1 = '2024-01-13T10:00:00.000Z';

      for (const dayNow of [day1, day2]) {
        const svc = createService(() => dayNow);
        const s = svc.startSession({ projectId: PROJECT_A });
        svc.endSession({ sessionId: s.id, projectId: PROJECT_A, wordsWritten: 100 });
      }

      const service = createService(() => day3);
      const s = service.startSession({ projectId: PROJECT_A });
      service.endSession({ sessionId: s.id, projectId: PROJECT_A, wordsWritten: 100 });

      const dashboard = service.getDashboard(PROJECT_A);
      expect(dashboard.streak.currentStreak).toBe(3);
    });

    it('breaks streak on gap', () => {
      const day3 = '2024-01-15T10:00:00.000Z';
      const day1 = '2024-01-13T10:00:00.000Z';

      const svc1 = createService(() => day1);
      const s1 = svc1.startSession({ projectId: PROJECT_A });
      svc1.endSession({ sessionId: s1.id, projectId: PROJECT_A, wordsWritten: 100 });

      const service = createService(() => day3);
      const s3 = service.startSession({ projectId: PROJECT_A });
      service.endSession({ sessionId: s3.id, projectId: PROJECT_A, wordsWritten: 100 });

      const dashboard = service.getDashboard(PROJECT_A);
      expect(dashboard.streak.currentStreak).toBe(1);
    });

    it('tracks longestStreak correctly', () => {
      const days = [
        '2024-01-10T10:00:00.000Z',
        '2024-01-11T10:00:00.000Z',
        '2024-01-12T10:00:00.000Z',
        '2024-01-15T10:00:00.000Z',
      ];

      for (const day of days) {
        const svc = createService(() => day);
        const s = svc.startSession({ projectId: PROJECT_A });
        svc.endSession({ sessionId: s.id, projectId: PROJECT_A, wordsWritten: 100 });
      }

      const service = createService(() => days[days.length - 1]);
      const dashboard = service.getDashboard(PROJECT_A);
      expect(dashboard.streak.longestStreak).toBe(3);
      expect(dashboard.streak.currentStreak).toBe(1);
    });
  });

  describe('computeWeekly', () => {
    it('produces exactly 7 entries', () => {
      const service = createService();
      const dashboard = service.getDashboard(PROJECT_A);
      expect(dashboard.weekly.days).toHaveLength(7);
    });

    it('correctly assigns words to each day bucket', () => {
      const now = '2024-01-15T10:00:00.000Z';
      const service = createService(() => now);
      const s = service.startSession({ projectId: PROJECT_A });
      service.endSession({ sessionId: s.id, projectId: PROJECT_A, wordsWritten: 400 });

      const dashboard = service.getDashboard(PROJECT_A);
      const todayEntry = dashboard.weekly.days[dashboard.weekly.days.length - 1];
      expect(todayEntry.date).toBe('2024-01-15');
      expect(todayEntry.wordsWritten).toBe(400);
    });
  });
});
