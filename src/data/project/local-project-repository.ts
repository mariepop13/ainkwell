import type { ProjectRepository } from '@/domain/project/repository';
import {
  saveSceneInputSchema,
  sceneSchema,
  sceneSummarySchema,
  workspaceStoreSchema,
  type WorkspaceStoreV1,
} from '@/domain/scene/schemas';
import type { Scene, SceneSummary } from '@/domain/scene/types';

export const workspaceStorageKey = 'ainkwell:workspace:v1';
export const projectNotFoundCode = 'PROJECT_NOT_FOUND';
export const sceneNotFoundCode = 'SCENE_NOT_FOUND';

const browserOnlyRepositoryMessage = 'Local project repository is available only in the browser.';
const demoProjectId = 'demo-project';
const demoProjectTitle = 'Demo Project';

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

export class LocalProjectRepository implements ProjectRepository {
  public async getScene(input: { projectId: string; sceneId: string }): Promise<Scene | null> {
    const workspaceStore = this.readWorkspaceStore();
    const project = this.getProjectOrThrow(workspaceStore, input.projectId);
    const scene = project.scenes[input.sceneId];

    if (!scene || scene.projectId !== input.projectId) {
      return null;
    }

    return sceneSchema.parse(scene);
  }

  public async listScenes(input: { projectId: string }): Promise<SceneSummary[]> {
    const workspaceStore = this.readWorkspaceStore();
    const project = this.getProjectOrThrow(workspaceStore, input.projectId);

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
    const project = this.getProjectOrThrow(workspaceStore, parsedInput.projectId);
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

  private getProjectOrThrow(
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
