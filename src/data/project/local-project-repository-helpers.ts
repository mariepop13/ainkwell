import {
  legacyProjectStorageSchema,
  projectStorageSchema,
  v2ProjectStorageSchema,
  writingProjectSchema,
  type LegacyProjectStorage,
  type ProjectStorage,
  type V2ProjectStorage,
} from '@/domain/project/schemas';
import type {
  ProjectChapter,
  ProjectSettings,
  ProjectStats,
  WritingProject,
} from '@/domain/project/types';
import {
  sceneSchema,
  workspaceStoreSchema,
  type WorkspaceStoreV1,
} from '@/domain/scene/schemas';
import type { Scene } from '@/domain/scene/types';
import { generateProjectId } from '@/lib/utils';

export const PROJECT_STORAGE_VERSION = 3 as const;
export const browserOnlyRepositoryMessage = 'Local project repository is available only in the browser.';
export const defaultSceneContent = '';
const importedDemoProjectTitle = 'Imported Demo Project';
const defaultSceneTitle = 'Scene 1';
const defaultChapterTitle = 'Chapter 1';
const defaultSceneStatus: Scene['status'] = 'draft';

type MergeLegacyInput = {
  projectStorage: ProjectStorage;
  legacyWorkspace: WorkspaceStoreV1 | null;
  importedAt: string;
};

type ParseStorageResult = {
  storage: ProjectStorage;
  needsWrite: boolean;
};

type CreateProjectSceneInput = {
  projectId: string;
  title: string;
  content: string;
  status: Scene['status'];
  updatedAt: string;
  id?: string;
};

const withFallbackStorage = (): ParseStorageResult => ({
  storage: createEmptyProjectStorage(),
  needsWrite: true,
});

const parseJson = (rawStorageValue: string): unknown | null => {
  try {
    return JSON.parse(rawStorageValue) as unknown;
  } catch (error) {
    console.error('Failed to parse project storage, fallback to empty workspace.', error);
    return null;
  }
};

const countWords = (content: string): number => {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return 0;
  }

  return trimmedContent.split(/\s+/).filter(Boolean).length;
};

const calculateChapterWordCount = (
  chapter: ProjectChapter,
  scenes: Record<string, { content: string }>,
): number =>
  chapter.sceneOrder.reduce<number>((total, sceneId) => {
    const scene = scenes[sceneId];
    if (!scene) {
      return total;
    }

    return total + countWords(scene.content);
  }, 0);

const parseV3ProjectStorage = (value: unknown): ProjectStorage | null => {
  const validatedStorage = projectStorageSchema.safeParse(value);
  if (!validatedStorage.success) {
    return null;
  }

  return {
    version: validatedStorage.data.version,
    projects: sortProjectsByUpdatedAt(validatedStorage.data.projects),
  };
};

export const createDefaultProjectStats = (): ProjectStats => ({
  wordCount: 0,
  sceneCount: 0,
  chapterCount: 0,
});

export const createDefaultProjectSettings = (): ProjectSettings => ({
  language: 'en',
  targetWordCount: null,
});

export const createEmptyProjectStorage = (): ProjectStorage => ({
  version: PROJECT_STORAGE_VERSION,
  projects: [],
});

export const sortProjectsByUpdatedAt = (projects: WritingProject[]): WritingProject[] =>
  [...projects].sort(
    (leftProject, rightProject) =>
      new Date(rightProject.updatedAt).getTime() - new Date(leftProject.updatedAt).getTime(),
  );

export const createDefaultChapter = (projectId: string, createdAt: string): ProjectChapter => ({
  id: generateProjectId(),
  projectId,
  title: defaultChapterTitle,
  sceneOrder: [],
  wordCount: 0,
  createdAt,
});

export const withRecalculatedStats = (project: WritingProject): WritingProject => {
  const updatedChapters = { ...project.chapters };
  let totalWordCount = 0;
  let totalSceneCount = 0;

  for (const chapterId of project.chapterOrder) {
    const chapter = project.chapters[chapterId];
    if (!chapter) {
      continue;
    }

    const chapterWordCount = calculateChapterWordCount(chapter, project.scenes);
    updatedChapters[chapterId] = { ...chapter, wordCount: chapterWordCount };
    totalWordCount += chapterWordCount;
    totalSceneCount += chapter.sceneOrder.length;
  }

  return writingProjectSchema.parse({
    ...project,
    chapters: updatedChapters,
    stats: {
      ...project.stats,
      wordCount: totalWordCount,
      sceneCount: totalSceneCount,
      chapterCount: project.chapterOrder.length,
    },
  });
};

export const createProjectScene = (input: CreateProjectSceneInput): Scene =>
  sceneSchema.parse({
    id: input.id ?? generateProjectId(),
    projectId: input.projectId,
    title: input.title.trim(),
    content: input.content,
    status: input.status,
    updatedAt: input.updatedAt,
  });

export const createDefaultProjectScene = (projectId: string, updatedAt: string): Scene =>
  createProjectScene({
    projectId,
    title: defaultSceneTitle,
    content: defaultSceneContent,
    status: defaultSceneStatus,
    updatedAt,
  });

export const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.error('Local storage is not accessible in this environment.', error);
    return null;
  }
};

const upgradeV2StorageToV3 = (v2Storage: V2ProjectStorage): ProjectStorage => ({
  version: PROJECT_STORAGE_VERSION,
  projects: v2Storage.projects.map((v2Project) => {
    const chapter = createDefaultChapter(v2Project.id, v2Project.createdAt);
    const chapterWithAllScenes = { ...chapter, sceneOrder: v2Project.sceneOrder };

    const upgradedProject = writingProjectSchema.parse({
      id: v2Project.id,
      title: v2Project.title,
      description: v2Project.description,
      createdAt: v2Project.createdAt,
      updatedAt: v2Project.updatedAt,
      stats: v2Project.stats,
      settings: v2Project.settings,
      chapterOrder: [chapter.id],
      chapters: { [chapter.id]: chapterWithAllScenes },
      scenes: v2Project.scenes,
    });

    return withRecalculatedStats(upgradedProject);
  }),
});

const upgradeLegacyProjectStorage = (legacyStorage: LegacyProjectStorage): ProjectStorage => ({
  version: PROJECT_STORAGE_VERSION,
  projects: legacyStorage.projects.map((legacyProject) => {
    const seedScene = createDefaultProjectScene(legacyProject.id, legacyProject.updatedAt);
    const chapter = createDefaultChapter(legacyProject.id, legacyProject.createdAt);
    const chapterWithScene = { ...chapter, sceneOrder: [seedScene.id] };

    const upgradedProject = writingProjectSchema.parse({
      ...legacyProject,
      chapterOrder: [chapter.id],
      chapters: { [chapter.id]: chapterWithScene },
      scenes: { [seedScene.id]: seedScene },
    });

    return withRecalculatedStats(upgradedProject);
  }),
});

export const parseProjectStorageValue = (rawStorageValue: string | null): ParseStorageResult => {
  if (!rawStorageValue) {
    return {
      storage: createEmptyProjectStorage(),
      needsWrite: false,
    };
  }

  const parsedStorageValue = parseJson(rawStorageValue);
  if (!parsedStorageValue) {
    return withFallbackStorage();
  }

  const validatedV3Storage = parseV3ProjectStorage(parsedStorageValue);
  if (validatedV3Storage) {
    return { storage: validatedV3Storage, needsWrite: false };
  }

  const v2Storage = v2ProjectStorageSchema.safeParse(parsedStorageValue);
  if (v2Storage.success) {
    return {
      storage: upgradeV2StorageToV3(v2Storage.data),
      needsWrite: true,
    };
  }

  const legacyStorage = legacyProjectStorageSchema.safeParse(parsedStorageValue);
  if (legacyStorage.success) {
    return {
      storage: upgradeLegacyProjectStorage(legacyStorage.data),
      needsWrite: true,
    };
  }

  console.error('Invalid project storage shape, fallback to empty workspace.');
  return withFallbackStorage();
};

export const parseLegacyWorkspace = (rawWorkspaceValue: string | null): WorkspaceStoreV1 | null => {
  if (!rawWorkspaceValue) {
    return null;
  }

  const parsedWorkspace = parseJson(rawWorkspaceValue);
  if (!parsedWorkspace) {
    return null;
  }

  const validatedWorkspace = workspaceStoreSchema.safeParse(parsedWorkspace);
  if (!validatedWorkspace.success) {
    console.error('Invalid legacy workspace format, skipping legacy import.');
    return null;
  }

  return validatedWorkspace.data;
};

const importScenesIntoProject = (
  project: WritingProject,
  legacyProject: WorkspaceStoreV1['projects'][string],
  importedAt: string,
): WritingProject => {
  const nextScenes: Record<string, Scene> = { ...project.scenes };
  const nextChapters = { ...project.chapters };
  const targetChapterId = project.chapterOrder[0];
  let importedCount = 0;

  if (!targetChapterId || !nextChapters[targetChapterId]) {
    return project;
  }

  const nextChapterSceneOrder = [...(nextChapters[targetChapterId]!.sceneOrder)];

  for (const legacySceneId of legacyProject.sceneOrder) {
    const legacyScene = legacyProject.scenes[legacySceneId];
    if (!legacyScene) {
      continue;
    }

    const sceneId = resolveImportedSceneId(legacyScene.id, nextScenes);
    nextScenes[sceneId] = createProjectScene({
      id: sceneId,
      projectId: project.id,
      title: legacyScene.title,
      content: legacyScene.content,
      status: legacyScene.status,
      updatedAt: legacyScene.updatedAt,
    });
    nextChapterSceneOrder.push(sceneId);
    importedCount += 1;
  }

  if (importedCount === 0) {
    return project;
  }

  nextChapters[targetChapterId] = {
    ...nextChapters[targetChapterId]!,
    sceneOrder: nextChapterSceneOrder,
  };

  return withRecalculatedStats(
    writingProjectSchema.parse({
      ...project,
      chapters: nextChapters,
      scenes: nextScenes,
      updatedAt: importedAt,
    }),
  );
};

const resolveImportedSceneId = (initialSceneId: string, scenes: Record<string, Scene>): string => {
  if (!(initialSceneId in scenes)) {
    return initialSceneId;
  }

  let nextSceneId = generateProjectId();
  while (nextSceneId in scenes) {
    nextSceneId = generateProjectId();
  }

  return nextSceneId;
};

const createImportedProjectFromLegacy = (
  legacyProject: WorkspaceStoreV1['projects'][string],
  importedAt: string,
): WritingProject => {
  const projectId = generateProjectId();
  const defaultChapter = createDefaultChapter(projectId, importedAt);

  const importedProject = writingProjectSchema.parse({
    id: projectId,
    title:
      legacyProject.id === 'demo-project' ? importedDemoProjectTitle : `Imported ${legacyProject.title}`,
    description: 'Imported from legacy scene workspace.',
    createdAt: importedAt,
    updatedAt: importedAt,
    stats: createDefaultProjectStats(),
    settings: createDefaultProjectSettings(),
    chapterOrder: [defaultChapter.id],
    chapters: { [defaultChapter.id]: defaultChapter },
    scenes: {},
  });

  return importScenesIntoProject(importedProject, legacyProject, importedAt);
};

const mergeLegacyProject = (
  projectStorage: ProjectStorage,
  legacyProject: WorkspaceStoreV1['projects'][string],
  importedAt: string,
): { projects: WritingProject[]; didMerge: boolean } => {
  const nextProjects = [...projectStorage.projects];
  const projectIndex = nextProjects.findIndex((project) => project.id === legacyProject.id);

  if (projectIndex >= 0) {
    nextProjects[projectIndex] = importScenesIntoProject(
      nextProjects[projectIndex]!,
      legacyProject,
      importedAt,
    );
    return { projects: nextProjects, didMerge: true };
  }

  if (nextProjects.length === 1) {
    nextProjects[0] = importScenesIntoProject(nextProjects[0]!, legacyProject, importedAt);
    return { projects: nextProjects, didMerge: true };
  }

  if (nextProjects.length === 0 || legacyProject.id === 'demo-project') {
    nextProjects.push(createImportedProjectFromLegacy(legacyProject, importedAt));
    return { projects: nextProjects, didMerge: true };
  }

  return { projects: nextProjects, didMerge: false };
};

export const mergeLegacyWorkspaceIntoProjectStorage = (
  input: MergeLegacyInput,
): { storage: ProjectStorage; didMerge: boolean } => {
  if (!input.legacyWorkspace) {
    return { storage: input.projectStorage, didMerge: false };
  }

  let didMerge = false;
  let projects = [...input.projectStorage.projects];

  for (const legacyProject of Object.values(input.legacyWorkspace.projects)) {
    const { projects: mergedProjects, didMerge: merged } = mergeLegacyProject(
      { version: PROJECT_STORAGE_VERSION, projects },
      legacyProject,
      input.importedAt,
    );
    projects = mergedProjects;
    didMerge = didMerge || merged;
  }

  return {
    storage: {
      version: PROJECT_STORAGE_VERSION,
      projects: sortProjectsByUpdatedAt(projects),
    },
    didMerge,
  };
};
