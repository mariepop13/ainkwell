import { endSessionInputSchema, setDailyGoalInputSchema, startSessionInputSchema, writingSessionSchema } from '@/domain/writing-session/schemas';
import type { WritingSessionRepository } from '@/domain/writing-session/repository';
import type {
  DailyProgress,
  EndSessionInput,
  SessionDashboard,
  SetDailyGoalInput,
  StartSessionInput,
  StreakInfo,
  WeeklySummary,
  WritingSession,
} from '@/domain/writing-session/types';

export class WritingSessionValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'WritingSessionValidationError';
  }
}

const RECENT_SESSIONS_LIMIT = 50;
const WEEKLY_DAYS_COUNT = 7;

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoToLocalDateString(isoString: string): string {
  return localDateString(new Date(isoString));
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36);
  return `${timePart}-${randomPart}`;
}

export class WritingSessionService {
  private readonly repository: WritingSessionRepository;
  private readonly now: () => string;

  public constructor(repository: WritingSessionRepository, nowProvider: () => string = () => new Date().toISOString()) {
    this.repository = repository;
    this.now = nowProvider;
  }

  public setDailyGoal(input: SetDailyGoalInput): void {
    const parsed = setDailyGoalInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new WritingSessionValidationError('Invalid daily goal input');
    }
    this.repository.setDailyGoal(parsed.data);
  }

  public startSession(input: StartSessionInput): WritingSession {
    const parsed = startSessionInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new WritingSessionValidationError('Invalid start session input');
    }

    const startedAt = parsed.data.startedAt ?? this.now();
    const session = writingSessionSchema.parse({
      id: generateId(),
      projectId: parsed.data.projectId,
      startedAt,
      endedAt: startedAt,
      durationSeconds: 0,
      wordsWritten: 0,
    });

    return this.repository.saveSession(session);
  }

  public endSession(input: EndSessionInput): WritingSession {
    const parsed = endSessionInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new WritingSessionValidationError('Invalid end session input');
    }

    const sessions = this.repository.listSessions(parsed.data.projectId);
    const existing = sessions.find((session) => session.id === parsed.data.sessionId);
    if (!existing) {
      throw new WritingSessionValidationError(`Session not found: ${parsed.data.sessionId}`);
    }

    const endedAt = parsed.data.endedAt ?? this.now();
    const durationSeconds = Math.max(
      0,
      Math.round((new Date(endedAt).getTime() - new Date(existing.startedAt).getTime()) / 1000),
    );

    const updatedSession = writingSessionSchema.parse({
      ...existing,
      endedAt,
      durationSeconds,
      wordsWritten: parsed.data.wordsWritten,
    });

    return this.repository.saveSession(updatedSession);
  }

  public getDashboard(projectId: string): SessionDashboard {
    const projectData = this.repository.getProjectData(projectId);
    const now = this.now();
    const todayProgress = this.computeTodayProgress(projectData.sessions, projectData.dailyGoal, now);
    const streak = this.computeStreak(projectData.sessions, now);
    const weekly = this.computeWeekly(projectData.sessions, projectData.dailyGoal, now);
    const recentSessions = [...projectData.sessions]
      .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
      .slice(0, RECENT_SESSIONS_LIMIT);

    return { projectId, dailyGoal: projectData.dailyGoal, todayProgress, streak, weekly, recentSessions };
  }

  private computeTodayProgress(sessions: WritingSession[], dailyGoal: number | null, now: string): DailyProgress {
    const today = isoToLocalDateString(now);
    const wordsWritten = sessions
      .filter((session) => isoToLocalDateString(session.startedAt) === today)
      .reduce((total, session) => total + session.wordsWritten, 0);
    const goalMet = dailyGoal !== null && wordsWritten >= dailyGoal;

    return { date: today, wordsWritten, goalMet };
  }

  private computeStreak(sessions: WritingSession[], now: string): StreakInfo {
    const dailyWordMap = new Map<string, number>();
    for (const session of sessions) {
      const date = isoToLocalDateString(session.startedAt);
      dailyWordMap.set(date, (dailyWordMap.get(date) ?? 0) + session.wordsWritten);
    }

    const nowDate = new Date(now);
    const todayYear = nowDate.getFullYear();
    const todayMonth = nowDate.getMonth();
    const todayDay = nowDate.getDate();

    let currentStreak = 0;
    for (let offset = 0; ; offset++) {
      const checkDate = new Date(todayYear, todayMonth, todayDay - offset);
      const dateStr = localDateString(checkDate);
      if ((dailyWordMap.get(dateStr) ?? 0) === 0) {
        break;
      }
      currentStreak += 1;
    }

    const sortedDates = Array.from(dailyWordMap.entries())
      .filter(([, words]) => words > 0)
      .map(([date]) => date)
      .sort();

    let longestStreak = 0;
    let tempStreak = 0;
    let previousDate: string | null = null;

    for (const date of sortedDates) {
      if (previousDate === null) {
        tempStreak = 1;
      } else {
        const prev = new Date(`${previousDate}T12:00:00`);
        const curr = new Date(`${date}T12:00:00`);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      previousDate = date;
    }

    return { currentStreak, longestStreak };
  }

  private computeWeekly(sessions: WritingSession[], dailyGoal: number | null, now: string): WeeklySummary {
    const nowDate = new Date(now);
    const todayYear = nowDate.getFullYear();
    const todayMonth = nowDate.getMonth();
    const todayDay = nowDate.getDate();
    const days: DailyProgress[] = [];

    for (let offset = WEEKLY_DAYS_COUNT - 1; offset >= 0; offset--) {
      const date = new Date(todayYear, todayMonth, todayDay - offset);
      const dateString = localDateString(date);

      const wordsWritten = sessions
        .filter((session) => isoToLocalDateString(session.startedAt) === dateString)
        .reduce((total, session) => total + session.wordsWritten, 0);

      days.push({ date: dateString, wordsWritten, goalMet: dailyGoal !== null && wordsWritten >= dailyGoal });
    }

    const totalWordsThisWeek = days.reduce((total, day) => total + day.wordsWritten, 0);
    return { days, totalWordsThisWeek };
  }
}
