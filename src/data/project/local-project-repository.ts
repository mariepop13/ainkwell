import {
  createProjectInputSchema,
  projectIdSchema,
  projectStorageSchema,
  updateProjectInputSchema,
  writingProjectSchema,
  type ProjectStorage,
} from '@/domain/project/schemas';
import type { ProjectRepository } from '@/domain/project/repository';
import type {
  CreateProjectInput,
  ProjectSettings,
  ProjectStats,
  UpdateProjectInput,
  WritingProject,
} from '@/domain/project/types';
import { generateProjectId } from '@/lib/utils';

export const PROJECT_STORAGE_KEY = 'ainkwell.projects.v1';
const PROJECT_STORAGE_VERSION = 1 as const;

const defaultProjectStats: ProjectStats = {
  wordCount: 0,
  sceneCount: 0,
  chapterCount: 0,
};

const defaultProjectSettings: ProjectSettings = {
  language: 'en',
  targetWordCount: null,
};

function sortProjectsByUpdatedAt(projects: WritingProject[]): WritingProject[] {
  return [...projects].sort(
    (leftProject, rightProject) =>
      new Date(rightProject.updatedAt).getTime() - new Date(leftProject.updatedAt).getTime(),
  );
}

function emptyStorageValue(): ProjectStorage {
  return {
    version: PROJECT_STORAGE_VERSION,
    projects: [],
  };
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.error('Local storage is not accessible in this environment.', error);
    return null;
  }
}

function parseStorageValue(rawValue: string | null): ProjectStorage {
  if (!rawValue) {
    return emptyStorageValue();
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    const validatedStorage = projectStorageSchema.safeParse(parsedValue);

    if (!validatedStorage.success) {
      console.error('Invalid project storage shape, fallback to empty workspace.');
      return emptyStorageValue();
    }

    return {
      version: validatedStorage.data.version,
      projects: sortProjectsByUpdatedAt(validatedStorage.data.projects),
    };
  } catch (error) {
    console.error('Failed to parse project storage, fallback to empty workspace.', error);
    return emptyStorageValue();
  }
}

function asProjectNotFound(projectId: string): Error {
  return new Error(`Project not found: ${projectId}`);
}

export class LocalProjectRepository implements ProjectRepository {
  async list(): Promise<WritingProject[]> {
    return this.readProjects();
  }

  async getById(id: string): Promise<WritingProject | null> {
    const validProjectId = projectIdSchema.parse(id);
    const projects = this.readProjects();
    return projects.find((project) => project.id === validProjectId) ?? null;
  }

  async create(input: CreateProjectInput): Promise<WritingProject> {
    const validInput = createProjectInputSchema.parse(input);
    const projects = this.readProjects();
    const timestamp = new Date().toISOString();

    const project = writingProjectSchema.parse({
      id: generateProjectId(),
      title: validInput.title,
      description: validInput.description,
      createdAt: timestamp,
      updatedAt: timestamp,
      stats: defaultProjectStats,
      settings: {
        ...defaultProjectSettings,
        ...(validInput.settings ?? {}),
      },
    });

    const nextProjects = sortProjectsByUpdatedAt([project, ...projects]);
    this.writeProjects(nextProjects);

    return project;
  }

  async update(id: string, input: UpdateProjectInput): Promise<WritingProject> {
    const validProjectId = projectIdSchema.parse(id);
    const validInput = updateProjectInputSchema.parse(input);
    const projects = this.readProjects();
    const targetProject = projects.find((project) => project.id === validProjectId);

    if (!targetProject) {
      throw asProjectNotFound(validProjectId);
    }

    const updatedProject = writingProjectSchema.parse({
      ...targetProject,
      ...validInput,
      settings: {
        ...targetProject.settings,
        ...(validInput.settings ?? {}),
      },
      stats: {
        ...targetProject.stats,
        ...(validInput.stats ?? {}),
      },
      updatedAt: new Date().toISOString(),
    });

    const nextProjects = projects.map((project) =>
      project.id === validProjectId ? updatedProject : project,
    );

    this.writeProjects(nextProjects);

    return updatedProject;
  }

  async remove(id: string): Promise<void> {
    const validProjectId = projectIdSchema.parse(id);
    const projects = this.readProjects();
    const nextProjects = projects.filter((project) => project.id !== validProjectId);

    if (nextProjects.length === projects.length) {
      return;
    }

    this.writeProjects(nextProjects);
  }

  private readProjects(): WritingProject[] {
    const storage = getStorage();

    if (!storage) {
      return [];
    }

    const rawValue = storage.getItem(PROJECT_STORAGE_KEY);
    const storageValue = parseStorageValue(rawValue);

    return sortProjectsByUpdatedAt(storageValue.projects);
  }

  private writeProjects(projects: WritingProject[]): void {
    const storage = getStorage();

    if (!storage) {
      throw new Error('Storage is not available in this environment.');
    }

    const payload = projectStorageSchema.parse({
      version: PROJECT_STORAGE_VERSION,
      projects: sortProjectsByUpdatedAt(projects),
    });

    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(payload));
  }
}
