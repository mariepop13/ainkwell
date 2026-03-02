import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExportService } from '@/application/export/export-service';
import type { ProjectRepository } from '@/domain/project/repository';

const validProjectId = '550e8400-e29b-4d4a-a716-446655440000';

const validExportData = {
  version: 1 as const,
  exportedAt: '2026-01-01T00:00:00.000Z',
  project: {
    id: validProjectId,
    title: 'My Novel',
    description: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    settings: { language: 'en', targetWordCount: null },
    stats: { wordCount: 0, sceneCount: 0, chapterCount: 0 },
    chapterOrder: [],
    chapters: {},
    scenes: {},
  },
  bible: null,
  sessions: null,
};

describe('ExportService', () => {
  let mockRepository: ProjectRepository;

  beforeEach(() => {
    mockRepository = {
      exportProject: vi.fn(),
      importProject: vi.fn(),
    } as unknown as ProjectRepository;
  });

  it('calls exportProject with project id', async () => {
    vi.mocked(mockRepository.exportProject).mockResolvedValue(validExportData);

    const service = new ExportService(mockRepository);
    const result = await service.exportProjectJson(validProjectId);
    expect(mockRepository.exportProject).toHaveBeenCalledWith(validProjectId);
    expect(result.project.id).toBe(validProjectId);
  });

  it('calls importProject with parsed data', async () => {
    vi.mocked(mockRepository.importProject).mockResolvedValue(undefined);

    const service = new ExportService(mockRepository);
    await service.importProjectJson(validExportData);
    expect(mockRepository.importProject).toHaveBeenCalledWith(validExportData);
  });

  it('exportProjectMarkdown calls exportProject and returns markdown string', async () => {
    const chapterId = 'aaaaaaaa-0000-4000-8000-000000000001';
    const sceneId = 'aaaaaaaa-0000-4000-8000-000000000002';

    vi.mocked(mockRepository.exportProject).mockResolvedValue({
      ...validExportData,
      project: {
        ...validExportData.project,
        chapterOrder: [chapterId],
        chapters: {
          [chapterId]: {
            id: chapterId,
            projectId: validProjectId,
            title: 'Chapter One',
            sceneOrder: [sceneId],
          },
        },
        scenes: {
          [sceneId]: {
            id: sceneId,
            projectId: validProjectId,
            chapterId,
            title: 'Scene One',
            content: 'Once upon a time.',
            status: 'draft' as const,
            wordCount: 4,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    });

    const service = new ExportService(mockRepository);
    const markdown = await service.exportProjectMarkdown(validProjectId);
    expect(markdown).toContain('# My Novel');
    expect(markdown).toContain('## Chapter One');
    expect(markdown).toContain('### Scene One');
    expect(markdown).toContain('Once upon a time.');
  });
});
