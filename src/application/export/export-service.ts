import type { ProjectRepository } from '@/domain/project/repository';
import type { ProjectExport, WritingProject } from '@/domain/project/types';

export class ExportService {
  constructor(private readonly repository: ProjectRepository) {}

  async exportProjectJson(projectId: string): Promise<ProjectExport> {
    return this.repository.exportProject(projectId);
  }

  async importProjectJson(data: ProjectExport): Promise<void> {
    return this.repository.importProject(data);
  }

  async exportProjectMarkdown(projectId: string): Promise<string> {
    const exported = await this.repository.exportProject(projectId);
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
      lines.push(`### ${scene.title}`, '', scene.content.trim(), '', '---', '');
    }
  }

  return lines.join('\n');
}
