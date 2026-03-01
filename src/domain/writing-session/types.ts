export interface WritingSession {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  wordsWritten: number;
}

export interface ProjectSessionData {
  dailyGoal: number | null;
  sessions: WritingSession[];
}

export interface SessionStorage {
  version: 1;
  projects: Record<string, ProjectSessionData>;
}

export interface DailyProgress {
  date: string;
  wordsWritten: number;
  goalMet: boolean;
}

export interface WeeklySummary {
  days: DailyProgress[];
  totalWordsThisWeek: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
}

export interface SessionDashboard {
  projectId: string;
  dailyGoal: number | null;
  todayProgress: DailyProgress;
  streak: StreakInfo;
  weekly: WeeklySummary;
  recentSessions: WritingSession[];
}

export interface StartSessionInput {
  projectId: string;
  startedAt?: string;
}

export interface EndSessionInput {
  sessionId: string;
  projectId: string;
  endedAt?: string;
  wordsWritten: number;
}

export interface SetDailyGoalInput {
  projectId: string;
  goal: number | null;
}
