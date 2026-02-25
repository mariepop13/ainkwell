import type { Scene, SceneStatus, SceneSummary } from '@/domain/scene/types';

export interface ProjectRepository {
  getScene(input: { projectId: string; sceneId: string }): Promise<Scene | null>;
  listScenes(input: { projectId: string }): Promise<SceneSummary[]>;
  saveScene(input: {
    projectId: string;
    sceneId: string;
    content: string;
    status: SceneStatus;
    updatedAt: string;
  }): Promise<Scene>;
}
