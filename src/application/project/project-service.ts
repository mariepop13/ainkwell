import {
  createProjectInputSchema,
  projectIdSchema,
  updateProjectInputSchema,
} from '@/domain/project/schemas';
import type { ProjectRepository } from '@/domain/project/repository';
import type { CreateProjectInput, UpdateProjectInput, WritingProject } from '@/domain/project/types';

export interface ProjectService {
  listProjects(): Promise<WritingProject[]>;
  getProjectById(projectId: string): Promise<WritingProject | null>;
  createProject(input: CreateProjectInput): Promise<WritingProject>;
  updateProject(projectId: string, input: UpdateProjectInput): Promise<WritingProject>;
  deleteProject(projectId: string): Promise<void>;
}

class DefaultProjectService implements ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async listProjects(): Promise<WritingProject[]> {
    return this.repository.list();
  }

  async getProjectById(projectId: string): Promise<WritingProject | null> {
    const validProjectId = projectIdSchema.parse(projectId);
    return this.repository.getById(validProjectId);
  }

  async createProject(input: CreateProjectInput): Promise<WritingProject> {
    const validInput = createProjectInputSchema.parse(input);
    return this.repository.create(validInput);
  }

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<WritingProject> {
    const validProjectId = projectIdSchema.parse(projectId);
    const validInput = updateProjectInputSchema.parse(input);
    return this.repository.update(validProjectId, validInput);
  }

  async deleteProject(projectId: string): Promise<void> {
    const validProjectId = projectIdSchema.parse(projectId);
    return this.repository.remove(validProjectId);
  }
}

export function createProjectService(repository: ProjectRepository): ProjectService {
  return new DefaultProjectService(repository);
}
