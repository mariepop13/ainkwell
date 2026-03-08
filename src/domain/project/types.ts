import type { SceneBeat } from '@/domain/scene/schemas';
import type { SceneStatus } from '@/domain/scene/types';

export type ProjectStats = {
  wordCount: number;
  sceneCount: number;
  chapterCount: number;
};

export type ProjectSettings = {
  language: string;
  targetWordCount: number | null;
};

export type ProjectScene = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  status: SceneStatus;
  updatedAt: string;
  synopsis?: string;
  beats?: SceneBeat[];
};

export type ProjectChapter = {
  id: string;
  projectId: string;
  title: string;
  sceneOrder: string[];
  wordCount: number;
  createdAt: string;
};

export type ChapterSummary = {
  id: string;
  projectId: string;
  title: string;
  sceneCount: number;
  wordCount: number;
};

export type CreateChapterInput = {
  projectId: string;
  title: string;
};

export type UpdateChapterInput = {
  title?: string;
};

export type MoveSceneToChapterInput = {
  projectId: string;
  sceneId: string;
  targetChapterId: string;
};

export type WritingProject = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  stats: ProjectStats;
  settings: ProjectSettings;
  chapterOrder: string[];
  chapters: Record<string, ProjectChapter>;
  scenes: Record<string, ProjectScene>;
};

export type CreateProjectInput = {
  title: string;
  description: string;
  settings?: Partial<ProjectSettings>;
};

export type UpdateProjectInput = {
  title?: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
  stats?: Partial<ProjectStats>;
};

export type ReorderSceneInput = {
  projectId: string;
  sceneId: string;
  targetChapterId: string;
  targetIndex: number;
};

export type UpdateSceneInlineInput = {
  projectId: string;
  sceneId: string;
  title?: string;
  status?: SceneStatus;
  synopsis?: string;
};

export type ProjectExport = {
  version: 1;
  exportedAt: string;
  project: WritingProject;
  bible: unknown | null;
  sessions: unknown | null;
};

export type ManuscriptScene = {
  id: string;
  title: string;
  content: string;
  wordCount: number;
};

export type ManuscriptChapter = {
  id: string;
  title: string;
  chapterIndex: number;
  scenes: ManuscriptScene[];
  wordCount: number;
};

export type Manuscript = {
  projectTitle: string;
  chapters: ManuscriptChapter[];
  totalWordCount: number;
};
