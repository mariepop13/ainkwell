import type { SceneBeat } from '@/domain/scene/schemas';
import type {
  ChapterSummary,
  CreateChapterInput,
  CreateProjectInput,
  MoveSceneToChapterInput,
  ProjectChapter,
  UpdateProjectInput,
  WritingProject,
} from '@/domain/project/types';
import type { Scene, SceneStatus, SceneSummary } from '@/domain/scene/types';

export interface ProjectRepository {
  list(): Promise<WritingProject[]>;
  getById(id: string): Promise<WritingProject | null>;
  create(input: CreateProjectInput): Promise<WritingProject>;
  update(id: string, input: UpdateProjectInput): Promise<WritingProject>;
  remove(id: string): Promise<void>;
  createScene(input: { projectId: string; title: string; chapterId?: string }): Promise<Scene>;
  getScene(input: { projectId: string; sceneId: string }): Promise<Scene | null>;
  listScenes(input: { projectId: string }): Promise<SceneSummary[]>;
  saveScene(input: {
    projectId: string;
    sceneId: string;
    content: string;
    status: SceneStatus;
    updatedAt: string;
    synopsis?: string;
    beats?: SceneBeat[];
  }): Promise<Scene>;
  listChapters(input: { projectId: string }): Promise<ChapterSummary[]>;
  createChapter(input: CreateChapterInput): Promise<ProjectChapter>;
  renameChapter(input: { projectId: string; chapterId: string; title: string }): Promise<ProjectChapter>;
  deleteChapter(input: { projectId: string; chapterId: string }): Promise<void>;
  reorderChapter(input: {
    projectId: string;
    chapterId: string;
    direction: 'up' | 'down';
  }): Promise<void>;
  moveSceneToChapter(input: MoveSceneToChapterInput): Promise<void>;
}
