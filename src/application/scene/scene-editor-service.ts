import { ZodError } from 'zod';

import { projectNotFoundCode, sceneNotFoundCode } from '@/data/project/local-project-repository';
import type { ProjectRepository } from '@/domain/project/repository';
import { maxSceneContentLength } from '@/domain/scene/schemas';
import type { Scene, SceneStatus, SceneSummary } from '@/domain/scene/types';

type LoadSceneInput = {
  projectId: string;
  sceneId: string;
};

type SaveSceneInput = {
  projectId: string;
  sceneId: string;
  content: string;
  status: SceneStatus;
  updatedAt: string;
};

type CreateSceneInput = {
  projectId: string;
  title: string;
  chapterId?: string;
};

type ListProjectScenesInput = {
  projectId: string;
};

export type SceneLoadResult =
  | {
      state: 'project-not-found';
      scene: null;
      previousSceneId: null;
      nextSceneId: null;
    }
  | {
      state: 'scene-not-found';
      scene: null;
      previousSceneId: null;
      nextSceneId: null;
    }
  | {
      state: 'ready';
      scene: Scene;
      previousSceneId: string | null;
      nextSceneId: string | null;
    };

export type ProjectScenesResult =
  | {
      state: 'project-not-found';
      scenes: [];
    }
  | {
      state: 'ready';
      scenes: SceneSummary[];
    };

export interface SceneEditorServicePort {
  loadScene(input: LoadSceneInput): Promise<SceneLoadResult>;
  listProjectScenes(input: ListProjectScenesInput): Promise<ProjectScenesResult>;
  createScene(input: CreateSceneInput): Promise<Scene>;
  saveScene(input: SaveSceneInput): Promise<Scene>;
  countWords(content: string): number;
  toUserErrorMessage(error: unknown): string;
}

export class SceneEditorService implements SceneEditorServicePort {
  public constructor(private readonly projectRepository: ProjectRepository) {}

  public async loadScene(input: LoadSceneInput): Promise<SceneLoadResult> {
    const scenes = await this.getProjectScenes(input.projectId);

    if (!scenes) {
      return {
        state: 'project-not-found',
        scene: null,
        previousSceneId: null,
        nextSceneId: null,
      };
    }

    const sceneIndex = scenes.findIndex((scene) => scene.id === input.sceneId);
    if (sceneIndex < 0) {
      return {
        state: 'scene-not-found',
        scene: null,
        previousSceneId: null,
        nextSceneId: null,
      };
    }

    const scene = await this.projectRepository.getScene(input);
    if (!scene) {
      return {
        state: 'scene-not-found',
        scene: null,
        previousSceneId: null,
        nextSceneId: null,
      };
    }

    return {
      state: 'ready',
      scene,
      previousSceneId: scenes[sceneIndex - 1]?.id ?? null,
      nextSceneId: scenes[sceneIndex + 1]?.id ?? null,
    };
  }

  public async listProjectScenes(input: ListProjectScenesInput): Promise<ProjectScenesResult> {
    const scenes = await this.getProjectScenes(input.projectId);
    if (!scenes) {
      return { state: 'project-not-found', scenes: [] };
    }

    return { state: 'ready', scenes };
  }

  public async createScene(input: CreateSceneInput): Promise<Scene> {
    return this.projectRepository.createScene(input);
  }

  public async saveScene(input: SaveSceneInput): Promise<Scene> {
    return this.projectRepository.saveScene(input);
  }

  public countWords(content: string): number {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return 0;
    }

    return trimmedContent.split(/\s+/).filter(Boolean).length;
  }

  public toUserErrorMessage(error: unknown): string {
    if (this.isProjectNotFoundError(error)) {
      return 'Project not found.';
    }

    if (this.isSceneNotFoundError(error)) {
      return 'Scene not found.';
    }

    if (error instanceof ZodError) {
      const contentTooLarge = error.issues.some(
        (issue) => issue.path.includes('content') && issue.code === 'too_big',
      );
      if (contentTooLarge) {
        return `Scene content exceeds ${maxSceneContentLength} characters.`;
      }

      return 'Invalid scene data.';
    }

    return 'Unable to save scene. Retry.';
  }

  private async getProjectScenes(projectId: string): Promise<SceneSummary[] | null> {
    try {
      return await this.projectRepository.listScenes({ projectId });
    } catch (error) {
      if (this.isProjectNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  private isProjectNotFoundError(error: unknown): boolean {
    return error instanceof Error && error.message === projectNotFoundCode;
  }

  private isSceneNotFoundError(error: unknown): boolean {
    return error instanceof Error && error.message === sceneNotFoundCode;
  }
}
