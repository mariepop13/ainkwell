import type { ProjectSessionData, SetDailyGoalInput, WritingSession } from '@/domain/writing-session/types';

export interface WritingSessionRepository {
  getProjectData(projectId: string): ProjectSessionData;
  saveSession(session: WritingSession): WritingSession;
  setDailyGoal(input: SetDailyGoalInput): void;
  listSessions(projectId: string): WritingSession[];
}
