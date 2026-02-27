export type ProjectStats = {
  wordCount: number;
  sceneCount: number;
  chapterCount: number;
};

export type ProjectSettings = {
  language: string;
  targetWordCount: number | null;
};

export type WritingProject = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  stats: ProjectStats;
  settings: ProjectSettings;
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
