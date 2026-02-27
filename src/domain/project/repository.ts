import type { CreateProjectInput, UpdateProjectInput, WritingProject } from '@/domain/project/types';
import type { Scene, SceneStatus, SceneSummary } from '@/domain/scene/types';

export interface ProjectRepository {
  list(): Promise<WritingProject[]>;
  getById(id: string): Promise<WritingProject | null>;
  create(input: CreateProjectInput): Promise<WritingProject>;
  update(id: string, input: UpdateProjectInput): Promise<WritingProject>;
  remove(id: string): Promise<void>;
  createScene(input: { projectId: string; title: string }): Promise<Scene>;
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
