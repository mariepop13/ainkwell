import { createChapterInputSchema, projectIdSchema } from '@/domain/project/schemas';
import type { ProjectRepository } from '@/domain/project/repository';
import type {
  ChapterSummary,
  CreateChapterInput,
  MoveSceneToChapterInput,
  ProjectChapter,
} from '@/domain/project/types';

export interface ChapterService {
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

class DefaultChapterService implements ChapterService {
  constructor(private readonly repository: ProjectRepository) {}

  async listChapters(input: { projectId: string }): Promise<ChapterSummary[]> {
    const validProjectId = projectIdSchema.parse(input.projectId);
    return this.repository.listChapters({ projectId: validProjectId });
  }

  async createChapter(input: CreateChapterInput): Promise<ProjectChapter> {
    const validInput = createChapterInputSchema.parse(input);
    return this.repository.createChapter(validInput);
  }

  async renameChapter(input: {
    projectId: string;
    chapterId: string;
    title: string;
  }): Promise<ProjectChapter> {
    return this.repository.renameChapter(input);
  }

  async deleteChapter(input: { projectId: string; chapterId: string }): Promise<void> {
    return this.repository.deleteChapter(input);
  }

  async reorderChapter(input: {
    projectId: string;
    chapterId: string;
    direction: 'up' | 'down';
  }): Promise<void> {
    return this.repository.reorderChapter(input);
  }

  async moveSceneToChapter(input: MoveSceneToChapterInput): Promise<void> {
    return this.repository.moveSceneToChapter(input);
  }
}

export function createChapterService(repository: ProjectRepository): ChapterService {
  return new DefaultChapterService(repository);
}
