import type { CreateProjectInput, UpdateProjectInput, WritingProject } from '@/domain/project/types';

export interface ProjectRepository {
  list(): Promise<WritingProject[]>;
  getById(id: string): Promise<WritingProject | null>;
  create(input: CreateProjectInput): Promise<WritingProject>;
  update(id: string, input: UpdateProjectInput): Promise<WritingProject>;
  remove(id: string): Promise<void>;
}
