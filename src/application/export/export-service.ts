import type { ProjectRepository } from '@/domain/project/repository';
import { projectExportSchema, projectIdSchema } from '@/domain/project/schemas';
import type { ProjectExport, WritingProject } from '@/domain/project/types';

export class ExportService {
  constructor(private readonly repository: ProjectRepository) {}

  async exportProjectJson(projectId: string): Promise<ProjectExport> {
    const validProjectId = projectIdSchema.parse(projectId);
    return this.repository.exportProject(validProjectId);
  }

  async importProjectJson(data: ProjectExport): Promise<void> {
    projectExportSchema.parse(data);
    return this.repository.importProject(data);
  }

  async exportProjectMarkdown(projectId: string): Promise<string> {
    const validProjectId = projectIdSchema.parse(projectId);
    const exported = await this.repository.exportProject(validProjectId);
    return buildMarkdown(exported.project);
  }
}

function buildMarkdown(project: WritingProject): string {
  const lines: string[] = [`# ${project.title}`, ''];

  for (const chapterId of project.chapterOrder) {
    const chapter = project.chapters[chapterId];
    if (!chapter) continue;
    lines.push(`## ${chapter.title}`, '');

    for (const sceneId of chapter.sceneOrder) {
      const scene = project.scenes[sceneId];
      if (!scene) continue;
      const synopsisLine = scene.synopsis ? `*${scene.synopsis}*\n` : '';
      lines.push(`### ${scene.title}`, '', synopsisLine + scene.content.trim(), '', '---', '');
    }
  }

  return lines.join('\n');
}
