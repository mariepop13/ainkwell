import { z } from 'zod';

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
  UpdateProjectInput,
  WritingProject,
} from '@/domain/project/types';
import { saveSceneInputSchema, sceneSchema, sceneSummarySchema } from '@/domain/scene/schemas';
import type { Scene, SceneSummary } from '@/domain/scene/types';
import { generateProjectId } from '@/lib/utils';

import {
  browserOnlyRepositoryMessage,
  createDefaultProjectScene,
  createDefaultProjectSettings,
  createDefaultProjectStats,
  createEmptyProjectStorage,
  createProjectScene,
  defaultSceneContent,
  getStorage,
  mergeLegacyWorkspaceIntoProjectStorage,
  parseLegacyWorkspace,
  parseProjectStorageValue,
  PROJECT_STORAGE_VERSION,
  sortProjectsByUpdatedAt,
  withRecalculatedStats,
} from './local-project-repository-helpers';

export const PROJECT_STORAGE_KEY = 'ainkwell.projects.v1';
export const workspaceStorageKey = 'ainkwell:workspace:v1';

export const projectNotFoundCode = 'PROJECT_NOT_FOUND';
export const sceneNotFoundCode = 'SCENE_NOT_FOUND';

const createSceneInputSchema = z.object({
  projectId: projectIdSchema,
  title: z.string().trim().min(1).max(120),
});

const asProjectNotFound = (projectId: string): Error => new Error(`Project not found: ${projectId}`);

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
    const projectStorage = this.readProjectStorage();
    const timestamp = new Date().toISOString();
    const projectId = generateProjectId();
    const seedScene = createDefaultProjectScene(projectId, timestamp);

    const createdProject = withRecalculatedStats(
      writingProjectSchema.parse({
        id: projectId,
        title: validInput.title,
        description: validInput.description,
        createdAt: timestamp,
        updatedAt: timestamp,
        stats: createDefaultProjectStats(),
        settings: {
          ...createDefaultProjectSettings(),
          ...(validInput.settings ?? {}),
        },
        sceneOrder: [seedScene.id],
        scenes: {
          [seedScene.id]: seedScene,
        },
      }),
    );

    this.writeProjectStorage({
      version: PROJECT_STORAGE_VERSION,
      projects: sortProjectsByUpdatedAt([createdProject, ...projectStorage.projects]),
    });

    return createdProject;
  }

  public async update(id: string, input: UpdateProjectInput): Promise<WritingProject> {
    const validProjectId = projectIdSchema.parse(id);
    const validInput = updateProjectInputSchema.parse(input);
    const projectStorage = this.readProjectStorage();
    const targetProject = projectStorage.projects.find((project) => project.id === validProjectId);

    if (!targetProject) {
      throw asProjectNotFound(validProjectId);
    }

    const updatedProject = withRecalculatedStats(
      writingProjectSchema.parse({
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
      }),
    );

    this.writeProjects(
      projectStorage.projects.map((project) =>
        project.id === validProjectId ? updatedProject : project,
      ),
    );

    return updatedProject;
  }

  public async remove(id: string): Promise<void> {
    const validProjectId = projectIdSchema.parse(id);
    const projectStorage = this.readProjectStorage();
    const nextProjects = projectStorage.projects.filter((project) => project.id !== validProjectId);

    if (nextProjects.length === projectStorage.projects.length) {
      return;
    }

    this.writeProjects(nextProjects);
  }

  public async createScene(input: { projectId: string; title: string }): Promise<Scene> {
    const validInput = createSceneInputSchema.parse(input);
    const projectStorage = this.readProjectStorage();
    const project = this.getSceneProjectOrThrow(projectStorage.projects, validInput.projectId);

    const scene = createProjectScene({
      projectId: validInput.projectId,
      title: validInput.title,
      content: defaultSceneContent,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    });

    const updatedProject = withRecalculatedStats(
      writingProjectSchema.parse({
        ...project,
        updatedAt: scene.updatedAt,
        sceneOrder: [...project.sceneOrder, scene.id],
        scenes: {
          ...project.scenes,
          [scene.id]: scene,
        },
      }),
    );

    this.writeProjects(
      projectStorage.projects.map((currentProject) =>
        currentProject.id === validInput.projectId ? updatedProject : currentProject,
      ),
    );

    return scene;
  }

  public async getScene(input: { projectId: string; sceneId: string }): Promise<Scene | null> {
    const projectStorage = this.readProjectStorage();
    const project = this.getSceneProjectOrThrow(projectStorage.projects, input.projectId);
    const scene = project.scenes[input.sceneId];

    if (!scene || scene.projectId !== input.projectId) {
      return null;
    }

    return sceneSchema.parse(scene);
  }

  public async listScenes(input: { projectId: string }): Promise<SceneSummary[]> {
    const projectStorage = this.readProjectStorage();
    const project = this.getSceneProjectOrThrow(projectStorage.projects, input.projectId);

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
    const projectStorage = this.readProjectStorage();
    const project = this.getSceneProjectOrThrow(projectStorage.projects, parsedInput.projectId);
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

    const updatedProject = withRecalculatedStats(
      writingProjectSchema.parse({
        ...project,
        updatedAt: parsedInput.updatedAt,
        scenes: {
          ...project.scenes,
          [parsedInput.sceneId]: updatedScene,
        },
      }),
    );

    this.writeProjects(
      projectStorage.projects.map((currentProject) =>
        currentProject.id === parsedInput.projectId ? updatedProject : currentProject,
      ),
    );

    return updatedScene;
  }

  private readProjects(): WritingProject[] {
    return this.readProjectStorage().projects;
  }

  private readProjectStorage(): ProjectStorage {
    const storage = getStorage();

    if (!storage) {
      return createEmptyProjectStorage();
    }

    const parsedStorage = parseProjectStorageValue(storage.getItem(PROJECT_STORAGE_KEY));
    const legacyWorkspace = parseLegacyWorkspace(storage.getItem(workspaceStorageKey));

    const mergedStorage = mergeLegacyWorkspaceIntoProjectStorage({
      projectStorage: parsedStorage.storage,
      legacyWorkspace,
      importedAt: new Date().toISOString(),
    });

    if (parsedStorage.needsWrite || mergedStorage.didMerge) {
      this.writeProjectStorageToStorage(storage, mergedStorage.storage);
    }

    if (mergedStorage.didMerge) {
      storage.removeItem(workspaceStorageKey);
    }

    return mergedStorage.storage;
  }

  private writeProjects(projects: WritingProject[]): void {
    this.writeProjectStorage({
      version: PROJECT_STORAGE_VERSION,
      projects: sortProjectsByUpdatedAt(projects),
    });
  }

  private writeProjectStorage(projectStorage: ProjectStorage): void {
    const storage = getStorage();

    if (!storage) {
      throw new Error(browserOnlyRepositoryMessage);
    }

    this.writeProjectStorageToStorage(storage, projectStorage);
  }

  private writeProjectStorageToStorage(storage: Storage, projectStorage: ProjectStorage): void {
    const parsedStorage = projectStorageSchema.parse(projectStorage);
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(parsedStorage));
  }

  private getSceneProjectOrThrow(projects: WritingProject[], projectId: string): WritingProject {
    const project = projects.find((currentProject) => currentProject.id === projectId);
    if (!project) {
      throw new Error(projectNotFoundCode);
    }

    return project;
  }
}
