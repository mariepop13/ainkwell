import type { ProjectRepository } from '@/domain/project/repository';
import {
  createProjectInputSchema,
  projectIdSchema,
  projectStorageSchema,
  updateProjectInputSchema,
  writingProjectSchema,
  type ProjectStorage,
} from '@/domain/project/schemas';
import type {
  CreateProjectInput,
  ProjectSettings,
  ProjectStats,
  UpdateProjectInput,
  WritingProject,
} from '@/domain/project/types';
import {
  saveSceneInputSchema,
  sceneSchema,
  sceneSummarySchema,
  workspaceStoreSchema,
  type WorkspaceStoreV1,
} from '@/domain/scene/schemas';
import type { Scene, SceneSummary } from '@/domain/scene/types';
import { generateProjectId } from '@/lib/utils';

export const PROJECT_STORAGE_KEY = 'ainkwell.projects.v1';
const PROJECT_STORAGE_VERSION = 1 as const;

export const workspaceStorageKey = 'ainkwell:workspace:v1';
export const projectNotFoundCode = 'PROJECT_NOT_FOUND';
export const sceneNotFoundCode = 'SCENE_NOT_FOUND';

const browserOnlyRepositoryMessage = 'Local project repository is available only in the browser.';
const demoProjectId = 'demo-project';
const demoProjectTitle = 'Demo Project';

const defaultProjectStats: ProjectStats = {
  wordCount: 0,
  sceneCount: 0,
  chapterCount: 0,
};

const defaultProjectSettings: ProjectSettings = {
  language: 'en',
  targetWordCount: null,
};

type SceneSeed = Pick<Scene, 'id' | 'title' | 'content' | 'status' | 'updatedAt'>;

const demoSceneSeeds: SceneSeed[] = [
  {
    id: 'scene-1',
    title: 'Scene 1',
    content: '# Scene 1\n\nThis is the opening beat.',
    status: 'draft',
    updatedAt: '2026-02-25T00:00:00.000Z',
  },
  {
    id: 'scene-2',
    title: 'Scene 2',
    content: '## Rising Tension\n\nThe stakes increase for the protagonist.',
    status: 'revise',
    updatedAt: '2026-02-25T00:05:00.000Z',
  },
  {
    id: 'scene-3',
    title: 'Scene 3',
    content: 'Final confrontation notes and closing paragraph.',
    status: 'final',
    updatedAt: '2026-02-25T00:10:00.000Z',
  },
];

const createDemoScenes = (): WorkspaceStoreV1['projects'][string]['scenes'] =>
  Object.fromEntries(demoSceneSeeds.map((sceneSeed) => [sceneSeed.id, { ...sceneSeed, projectId: demoProjectId }]));

const createSeedWorkspaceStore = (): WorkspaceStoreV1 => ({
  version: 1,
  projects: {
    [demoProjectId]: {
      id: demoProjectId,
      title: demoProjectTitle,
      sceneOrder: demoSceneSeeds.map((sceneSeed) => sceneSeed.id),
      scenes: createDemoScenes(),
    },
  },
});

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
  public async list(): Promise<WritingProject[]> {
    return this.readProjects();
  }

  public async getById(id: string): Promise<WritingProject | null> {
    const validProjectId = projectIdSchema.parse(id);
    const projects = this.readProjects();
    return projects.find((project) => project.id === validProjectId) ?? null;
  }

  public async create(input: CreateProjectInput): Promise<WritingProject> {
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

  public async update(id: string, input: UpdateProjectInput): Promise<WritingProject> {
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

  public async remove(id: string): Promise<void> {
    const validProjectId = projectIdSchema.parse(id);
    const projects = this.readProjects();
    const nextProjects = projects.filter((project) => project.id !== validProjectId);

    if (nextProjects.length === projects.length) {
      return;
    }

    this.writeProjects(nextProjects);
  }

  public async getScene(input: { projectId: string; sceneId: string }): Promise<Scene | null> {
    const workspaceStore = this.readWorkspaceStore();
    const project = this.getSceneProjectOrThrow(workspaceStore, input.projectId);
    const scene = project.scenes[input.sceneId];

    if (!scene || scene.projectId !== input.projectId) {
      return null;
    }

    return sceneSchema.parse(scene);
  }

  public async listScenes(input: { projectId: string }): Promise<SceneSummary[]> {
    const workspaceStore = this.readWorkspaceStore();
    const project = this.getSceneProjectOrThrow(workspaceStore, input.projectId);

    return project.sceneOrder.map((sceneId) => {
      const scene = project.scenes[sceneId];
      if (!scene) {
        throw new Error(sceneNotFoundCode);
      }

      return sceneSummarySchema.parse(scene);
    });
  }

  public async saveScene(input: {
    projectId: string;
    sceneId: string;
    content: string;
    status: Scene['status'];
    updatedAt: string;
  }): Promise<Scene> {
    const parsedInput = saveSceneInputSchema.parse(input);
    const workspaceStore = this.readWorkspaceStore();
    const project = this.getSceneProjectOrThrow(workspaceStore, parsedInput.projectId);
    const existingScene = project.scenes[parsedInput.sceneId];

    if (!existingScene || existingScene.projectId !== parsedInput.projectId) {
      throw new Error(sceneNotFoundCode);
    }

    const updatedScene = sceneSchema.parse({
      ...existingScene,
      content: parsedInput.content,
      status: parsedInput.status,
      updatedAt: parsedInput.updatedAt,
    });

    const nextStore: WorkspaceStoreV1 = {
      ...workspaceStore,
      projects: {
        ...workspaceStore.projects,
        [parsedInput.projectId]: {
          ...project,
          scenes: {
            ...project.scenes,
            [parsedInput.sceneId]: updatedScene,
          },
        },
      },
    };

    this.writeWorkspaceStore(nextStore);
    return updatedScene;
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

  private readWorkspaceStore(): WorkspaceStoreV1 {
    this.assertBrowserContext();
    const storedWorkspace = window.localStorage.getItem(workspaceStorageKey);

    if (!storedWorkspace) {
      const seedWorkspace = createSeedWorkspaceStore();
      this.writeWorkspaceStore(seedWorkspace);
      return seedWorkspace;
    }

    try {
      const parsedWorkspace = JSON.parse(storedWorkspace) as unknown;
      return workspaceStoreSchema.parse(parsedWorkspace);
    } catch {
      const seedWorkspace = createSeedWorkspaceStore();
      this.writeWorkspaceStore(seedWorkspace);
      return seedWorkspace;
    }
  }

  private writeWorkspaceStore(workspaceStore: WorkspaceStoreV1): void {
    this.assertBrowserContext();
    const parsedWorkspace = workspaceStoreSchema.parse(workspaceStore);
    window.localStorage.setItem(workspaceStorageKey, JSON.stringify(parsedWorkspace));
  }

  private getSceneProjectOrThrow(
    workspaceStore: WorkspaceStoreV1,
    projectId: string,
  ): WorkspaceStoreV1['projects'][string] {
    const project = workspaceStore.projects[projectId];
    if (!project) {
      throw new Error(projectNotFoundCode);
    }

    return project;
  }

  private assertBrowserContext(): void {
    if (typeof window === 'undefined') {
      throw new Error(browserOnlyRepositoryMessage);
    }
  }
}
