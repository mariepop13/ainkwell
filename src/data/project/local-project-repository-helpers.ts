import {
  legacyProjectStorageSchema,
  projectStorageSchema,
  writingProjectSchema,
  type LegacyProjectStorage,
  type ProjectStorage,
} from '@/domain/project/schemas';
import type { ProjectSettings, ProjectStats, WritingProject } from '@/domain/project/types';
import {
  sceneSchema,
  workspaceStoreSchema,
  type WorkspaceStoreV1,
} from '@/domain/scene/schemas';
import type { Scene } from '@/domain/scene/types';
import { generateProjectId } from '@/lib/utils';

export const PROJECT_STORAGE_VERSION = 2 as const;
export const browserOnlyRepositoryMessage = 'Local project repository is available only in the browser.';
export const defaultSceneContent = '';
const importedDemoProjectTitle = 'Imported Demo Project';
const defaultSceneTitle = 'Scene 1';
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

const calculateProjectWordCount = (project: Pick<WritingProject, 'sceneOrder' | 'scenes'>): number =>
  project.sceneOrder.reduce<number>((totalWords, sceneId) => {
    const scene = project.scenes[sceneId];
    if (!scene) {
      return totalWords;
    }

    return totalWords + countWords(scene.content);
  }, 0);

const parseV2ProjectStorage = (value: unknown): ProjectStorage | null => {
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

export const withRecalculatedStats = (project: WritingProject): WritingProject =>
  writingProjectSchema.parse({
    ...project,
    stats: {
      ...project.stats,
      wordCount: calculateProjectWordCount(project),
      sceneCount: project.sceneOrder.length,
    },
  });

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

const upgradeLegacyProjectStorage = (legacyStorage: LegacyProjectStorage): ProjectStorage => ({
  version: PROJECT_STORAGE_VERSION,
  projects: legacyStorage.projects.map((legacyProject) => {
    const seedScene = createDefaultProjectScene(legacyProject.id, legacyProject.updatedAt);
    const upgradedProject = writingProjectSchema.parse({
      ...legacyProject,
      sceneOrder: [seedScene.id],
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

  const validatedStorage = parseV2ProjectStorage(parsedStorageValue);
  if (validatedStorage) {
    return { storage: validatedStorage, needsWrite: false };
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
  const nextSceneOrder = [...project.sceneOrder];
  let importedCount = 0;

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
    nextSceneOrder.push(sceneId);
    importedCount += 1;
  }

  if (importedCount === 0) {
    return project;
  }

  return withRecalculatedStats(
    writingProjectSchema.parse({
      ...project,
      scenes: nextScenes,
      sceneOrder: nextSceneOrder,
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
  const importedProject = writingProjectSchema.parse({
    id: generateProjectId(),
    title:
      legacyProject.id === 'demo-project' ? importedDemoProjectTitle : `Imported ${legacyProject.title}`,
    description: 'Imported from legacy scene workspace.',
    createdAt: importedAt,
    updatedAt: importedAt,
    stats: createDefaultProjectStats(),
    settings: createDefaultProjectSettings(),
    sceneOrder: [],
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
