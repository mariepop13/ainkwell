import { sessionStorageSchema, writingSessionSchema } from '@/domain/writing-session/schemas';
import type { WritingSessionRepository } from '@/domain/writing-session/repository';
import type { ProjectSessionData, SetDailyGoalInput, WritingSession } from '@/domain/writing-session/types';

export const WRITING_SESSION_STORAGE_KEY = 'ainkwell:writing-sessions:v1';

function cloneEmptyProjectSessionData(): ProjectSessionData {
  return { dailyGoal: null, sessions: [] };
}

function normalizeProjectId(projectId: string): string {
  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId) {
    throw new Error('projectId is required');
  }
  return normalizedProjectId;
}

function parseJson(rawValue: string | null): unknown | null {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

function upsertRecord<T extends { id: string }>(records: T[], record: T): void {
  const index = records.findIndex((item) => item.id === record.id);
  if (index < 0) {
    records.push(record);
  } else {
    records[index] = record;
  }
}

const noOpStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  length: 0,
};

export class LocalWritingSessionRepository implements WritingSessionRepository {
  private readonly storage: Storage;

  public constructor(storage?: Storage) {
    if (storage) {
      this.storage = storage;
      return;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
      return;
    }

    this.storage = noOpStorage;
  }

  public getProjectData(projectId: string): ProjectSessionData {
    const normalizedProjectId = normalizeProjectId(projectId);
    const storageData = this.readStorage();
    const projectData = storageData.projects[normalizedProjectId];
    if (!projectData) {
      return cloneEmptyProjectSessionData();
    }

    return { dailyGoal: projectData.dailyGoal, sessions: [...projectData.sessions] };
  }

  public saveSession(session: WritingSession): WritingSession {
    const parsedSession = writingSessionSchema.parse(session);
    const normalizedProjectId = normalizeProjectId(parsedSession.projectId);
    const storageData = this.readStorage();

    const projectData = storageData.projects[normalizedProjectId] ?? cloneEmptyProjectSessionData();
    upsertRecord(projectData.sessions, parsedSession);
    storageData.projects[normalizedProjectId] = projectData;
    this.writeStorage(storageData);
    return parsedSession;
  }

  public setDailyGoal(input: SetDailyGoalInput): void {
    const normalizedProjectId = normalizeProjectId(input.projectId);
    const storageData = this.readStorage();

    const projectData = storageData.projects[normalizedProjectId] ?? cloneEmptyProjectSessionData();
    projectData.dailyGoal = input.goal;
    storageData.projects[normalizedProjectId] = projectData;
    this.writeStorage(storageData);
  }

  public listSessions(projectId: string): WritingSession[] {
    const normalizedProjectId = normalizeProjectId(projectId);
    const projectData = this.getProjectData(normalizedProjectId);
    return [...projectData.sessions];
  }

  private readStorage(): { version: 1; projects: Record<string, ProjectSessionData> } {
    const rawValue = this.storage.getItem(WRITING_SESSION_STORAGE_KEY);
    const parsedValue = parseJson(rawValue);

    if (!parsedValue) {
      return { version: 1, projects: {} };
    }

    const parsedStorage = sessionStorageSchema.safeParse(parsedValue);
    if (!parsedStorage.success) {
      return { version: 1, projects: {} };
    }

    return { version: 1, projects: { ...parsedStorage.data.projects } };
  }

  private writeStorage(data: { version: 1; projects: Record<string, ProjectSessionData> }): void {
    const parsedStorage = sessionStorageSchema.parse(data);
    const payload = JSON.stringify(parsedStorage);
    this.storage.setItem(WRITING_SESSION_STORAGE_KEY, payload);
  }
}
