import { z } from 'zod';

import type { ProjectRepository } from '@/domain/project/repository';
import {
  createChapterInputSchema,
  createProjectInputSchema,
  projectExportSchema,
  projectIdSchema,
  projectStorageSchema,
  updateProjectInputSchema,
  writingProjectSchema,
  type ProjectStorage,
} from '@/domain/project/schemas';
import type {
  ChapterSummary,
  CreateChapterInput,
  CreateProjectInput,
  MoveSceneToChapterInput,
  ProjectChapter,
  ProjectExport,
  UpdateProjectInput,
  WritingProject,
} from '@/domain/project/types';
import { saveSceneInputSchema, sceneSchema, sceneSummarySchema } from '@/domain/scene/schemas';
import type { Scene, SceneSummary } from '@/domain/scene/types';
import { generateProjectId } from '@/lib/utils';

import {
  browserOnlyRepositoryMessage,
  createDefaultChapter,
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
export const chapterNotFoundCode = 'CHAPTER_NOT_FOUND';
export const cannotDeleteOnlyChapterCode = 'CANNOT_DELETE_ONLY_CHAPTER';

const createSceneInputSchema = z.object({
  projectId: projectIdSchema,
  title: z.string().trim().min(1).max(120),
  chapterId: z.string().trim().min(1).optional(),
});

const renameChapterInputSchema = z.object({
  projectId: projectIdSchema,
  chapterId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
});

const asProjectNotFound = (): Error => new Error(projectNotFoundCode);
const asChapterNotFound = (): Error => new Error(chapterNotFoundCode);

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
    const defaultChapter = createDefaultChapter(projectId, timestamp);
    const chapterWithScene = { ...defaultChapter, sceneOrder: [seedScene.id] };

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
        chapterOrder: [defaultChapter.id],
        chapters: { [defaultChapter.id]: chapterWithScene },
        scenes: { [seedScene.id]: seedScene },
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
      throw asProjectNotFound();
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

  public async createScene(input: {
    projectId: string;
    title: string;
    chapterId?: string;
  }): Promise<Scene> {
    const validInput = createSceneInputSchema.parse(input);
    const projectStorage = this.readProjectStorage();
    const project = this.getProjectOrThrow(projectStorage.projects, validInput.projectId);

    const targetChapterId =
      validInput.chapterId ?? project.chapterOrder[project.chapterOrder.length - 1];

    if (!targetChapterId || !project.chapters[targetChapterId]) {
      throw asChapterNotFound();
    }

    const scene = createProjectScene({
      projectId: validInput.projectId,
      title: validInput.title,
      content: defaultSceneContent,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    });

    const targetChapter = project.chapters[targetChapterId]!;
    const updatedChapter = {
      ...targetChapter,
      sceneOrder: [...targetChapter.sceneOrder, scene.id],
    };

    const updatedProject = withRecalculatedStats(
      writingProjectSchema.parse({
        ...project,
        updatedAt: scene.updatedAt,
        chapters: {
          ...project.chapters,
          [targetChapterId]: updatedChapter,
        },
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
    const project = this.getProjectOrThrow(projectStorage.projects, input.projectId);
    const scene = project.scenes[input.sceneId];

    if (!scene || scene.projectId !== input.projectId) {
      return null;
    }

    return sceneSchema.parse(scene);
  }

  public async listScenes(input: { projectId: string }): Promise<SceneSummary[]> {
    const projectStorage = this.readProjectStorage();
    const project = this.getProjectOrThrow(projectStorage.projects, input.projectId);

    const flatSceneIds = project.chapterOrder.flatMap(
      (chapterId) => project.chapters[chapterId]?.sceneOrder ?? [],
    );

    return flatSceneIds.map((sceneId) => {
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
    const project = this.getProjectOrThrow(projectStorage.projects, parsedInput.projectId);
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

  public async listChapters(input: { projectId: string }): Promise<ChapterSummary[]> {
    const projectStorage = this.readProjectStorage();
    const project = this.getProjectOrThrow(projectStorage.projects, input.projectId);

    return project.chapterOrder.map((chapterId) => {
      const chapter = project.chapters[chapterId];
      if (!chapter) {
        throw asChapterNotFound();
      }

      return {
        id: chapter.id,
        projectId: chapter.projectId,
        title: chapter.title,
        sceneCount: chapter.sceneOrder.length,
        wordCount: chapter.wordCount,
      };
    });
  }

  public async createChapter(input: CreateChapterInput): Promise<ProjectChapter> {
    const validInput = createChapterInputSchema.parse(input);
    const projectStorage = this.readProjectStorage();
    const project = this.getProjectOrThrow(projectStorage.projects, validInput.projectId);
    const timestamp = new Date().toISOString();

    const newChapter: ProjectChapter = {
      id: generateProjectId(),
      projectId: validInput.projectId,
      title: validInput.title,
      sceneOrder: [],
      wordCount: 0,
      createdAt: timestamp,
    };

    const updatedProject = withRecalculatedStats(
      writingProjectSchema.parse({
        ...project,
        updatedAt: timestamp,
        chapterOrder: [...project.chapterOrder, newChapter.id],
        chapters: { ...project.chapters, [newChapter.id]: newChapter },
      }),
    );

    this.writeProjects(
      projectStorage.projects.map((currentProject) =>
        currentProject.id === validInput.projectId ? updatedProject : currentProject,
      ),
    );

    return newChapter;
  }

  public async renameChapter(input: {
    projectId: string;
    chapterId: string;
    title: string;
  }): Promise<ProjectChapter> {
    const validInput = renameChapterInputSchema.parse(input);
    const projectStorage = this.readProjectStorage();
    const project = this.getProjectOrThrow(projectStorage.projects, validInput.projectId);
    const chapter = project.chapters[validInput.chapterId];

    if (!chapter) {
      throw asChapterNotFound();
    }

    const updatedChapter = { ...chapter, title: validInput.title.trim() };
    const updatedProject = withRecalculatedStats(
      writingProjectSchema.parse({
        ...project,
        updatedAt: new Date().toISOString(),
        chapters: { ...project.chapters, [validInput.chapterId]: updatedChapter },
      }),
    );

    this.writeProjects(
      projectStorage.projects.map((currentProject) =>
        currentProject.id === validInput.projectId ? updatedProject : currentProject,
      ),
    );

    return updatedChapter;
  }

  public async deleteChapter(input: { projectId: string; chapterId: string }): Promise<void> {
    const projectStorage = this.readProjectStorage();
    const project = this.getProjectOrThrow(projectStorage.projects, input.projectId);
    const chapter = project.chapters[input.chapterId];

    if (!chapter) {
      throw asChapterNotFound();
    }

    if (project.chapterOrder.length === 1) {
      throw new Error(cannotDeleteOnlyChapterCode);
    }

    const chapterIndex = project.chapterOrder.indexOf(input.chapterId);
    const adjacentChapterId =
      chapterIndex > 0
        ? project.chapterOrder[chapterIndex - 1]!
        : project.chapterOrder[chapterIndex + 1]!;

    const adjacentChapter = project.chapters[adjacentChapterId]!;
    const mergedAdjacentChapter = {
      ...adjacentChapter,
      sceneOrder: [...adjacentChapter.sceneOrder, ...chapter.sceneOrder],
    };

    const nextChapterOrder = project.chapterOrder.filter((id) => id !== input.chapterId);
    const nextChapters = { ...project.chapters };
    delete nextChapters[input.chapterId];
    nextChapters[adjacentChapterId] = mergedAdjacentChapter;

    const updatedProject = withRecalculatedStats(
      writingProjectSchema.parse({
        ...project,
        updatedAt: new Date().toISOString(),
        chapterOrder: nextChapterOrder,
        chapters: nextChapters,
      }),
    );

    this.writeProjects(
      projectStorage.projects.map((currentProject) =>
        currentProject.id === input.projectId ? updatedProject : currentProject,
      ),
    );
  }

  public async reorderChapter(input: {
    projectId: string;
    chapterId: string;
    direction: 'up' | 'down';
  }): Promise<void> {
    const projectStorage = this.readProjectStorage();
    const project = this.getProjectOrThrow(projectStorage.projects, input.projectId);
    const chapterIndex = project.chapterOrder.indexOf(input.chapterId);

    if (chapterIndex < 0) {
      throw asChapterNotFound();
    }

    const swapIndex =
      input.direction === 'up' ? chapterIndex - 1 : chapterIndex + 1;

    if (swapIndex < 0 || swapIndex >= project.chapterOrder.length) {
      return;
    }

    const nextChapterOrder = [...project.chapterOrder];
    const swapped = nextChapterOrder[swapIndex]!;
    nextChapterOrder[swapIndex] = nextChapterOrder[chapterIndex]!;
    nextChapterOrder[chapterIndex] = swapped;

    const updatedProject = withRecalculatedStats(
      writingProjectSchema.parse({
        ...project,
        updatedAt: new Date().toISOString(),
        chapterOrder: nextChapterOrder,
      }),
    );

    this.writeProjects(
      projectStorage.projects.map((currentProject) =>
        currentProject.id === input.projectId ? updatedProject : currentProject,
      ),
    );
  }

  public async exportProject(projectId: string): Promise<ProjectExport> {
    const storage = getStorage();
    const projects = this.readProjects();
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
      throw new Error(projectNotFoundCode);
    }

    const bibleRaw = storage?.getItem(`ainkwell:projects:${projectId}:bible:v1`) ?? null;
    const sessionsRaw = storage?.getItem(`ainkwell:projects:${projectId}:sessions:v1`) ?? null;

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      project,
      bible: bibleRaw ? JSON.parse(bibleRaw) : null,
      sessions: sessionsRaw ? JSON.parse(sessionsRaw) : null,
    };
  }

  public async importProject(data: ProjectExport): Promise<void> {
    const parsed = projectExportSchema.parse(data);
    const storage = getStorage();

    if (!storage) {
      throw new Error(browserOnlyRepositoryMessage);
    }

    const newId = crypto.randomUUID();
    const importedProject = writingProjectSchema.parse({
      ...parsed.project,
      id: newId,
      title: `${parsed.project.title} (imported)`,
      scenes: Object.fromEntries(
        Object.entries(parsed.project.scenes).map(([, scene]) => [
          scene.id,
          { ...scene, projectId: newId },
        ]),
      ),
      chapters: Object.fromEntries(
        Object.entries(parsed.project.chapters).map(([id, chapter]) => [
          id,
          { ...chapter, projectId: newId },
        ]),
      ),
    });

    const projectStorage = this.readProjectStorage();
    this.writeProjectStorage({
      version: PROJECT_STORAGE_VERSION,
      projects: sortProjectsByUpdatedAt([importedProject, ...projectStorage.projects]),
    });

    if (parsed.bible) {
      storage.setItem(`ainkwell:projects:${newId}:bible:v1`, JSON.stringify(parsed.bible));
    }
    if (parsed.sessions) {
      storage.setItem(`ainkwell:projects:${newId}:sessions:v1`, JSON.stringify(parsed.sessions));
    }
  }

  public async moveSceneToChapter(input: MoveSceneToChapterInput): Promise<void> {
    const projectStorage = this.readProjectStorage();
    const project = this.getProjectOrThrow(projectStorage.projects, input.projectId);
    const targetChapter = project.chapters[input.targetChapterId];

    if (!targetChapter) {
      throw asChapterNotFound();
    }

    const sourceChapterId = project.chapterOrder.find((chapterId) =>
      project.chapters[chapterId]?.sceneOrder.includes(input.sceneId),
    );

    if (!sourceChapterId) {
      throw new Error(sceneNotFoundCode);
    }

    if (sourceChapterId === input.targetChapterId) {
      return;
    }

    const sourceChapter = project.chapters[sourceChapterId]!;
    const updatedSourceChapter = {
      ...sourceChapter,
      sceneOrder: sourceChapter.sceneOrder.filter((id) => id !== input.sceneId),
    };
    const updatedTargetChapter = {
      ...targetChapter,
      sceneOrder: [...targetChapter.sceneOrder, input.sceneId],
    };

    const updatedProject = withRecalculatedStats(
      writingProjectSchema.parse({
        ...project,
        updatedAt: new Date().toISOString(),
        chapters: {
          ...project.chapters,
          [sourceChapterId]: updatedSourceChapter,
          [input.targetChapterId]: updatedTargetChapter,
        },
      }),
    );

    this.writeProjects(
      projectStorage.projects.map((currentProject) =>
        currentProject.id === input.projectId ? updatedProject : currentProject,
      ),
    );
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

  private getProjectOrThrow(projects: WritingProject[], projectId: string): WritingProject {
    const project = projects.find((currentProject) => currentProject.id === projectId);
    if (!project) {
      throw new Error(projectNotFoundCode);
    }

    return project;
  }
}
