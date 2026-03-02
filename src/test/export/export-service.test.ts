import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExportService } from '@/application/export/export-service';
import type { ProjectRepository } from '@/domain/project/repository';

describe('ExportService', () => {
  let mockRepository: ProjectRepository;

  beforeEach(() => {
    mockRepository = {
      exportProject: vi.fn(),
      importProject: vi.fn(),
    } as unknown as ProjectRepository;
  });

  it('calls exportProject with project id', async () => {
    vi.mocked(mockRepository.exportProject).mockResolvedValue({
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      project: { id: 'p1', title: 'My Novel' } as any,
      bible: null,
      sessions: null,
    });

    const service = new ExportService(mockRepository);
    const result = await service.exportProjectJson('p1');
    expect(mockRepository.exportProject).toHaveBeenCalledWith('p1');
    expect(result.project.id).toBe('p1');
  });

  it('calls importProject with parsed data', async () => {
    vi.mocked(mockRepository.importProject).mockResolvedValue(undefined);

    const data = {
      version: 1 as const,
      exportedAt: '2026-01-01T00:00:00.000Z',
      project: { id: 'p1', title: 'My Novel' } as any,
      bible: null,
      sessions: null,
    };

    const service = new ExportService(mockRepository);
    await service.importProjectJson(data);
    expect(mockRepository.importProject).toHaveBeenCalledWith(data);
  });

  it('exportProjectMarkdown calls exportProject and returns markdown string', async () => {
    vi.mocked(mockRepository.exportProject).mockResolvedValue({
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      project: {
        id: 'p1',
        title: 'My Novel',
        chapterOrder: ['ch1'],
        chapters: {
          ch1: { id: 'ch1', title: 'Chapter One', sceneOrder: ['sc1'] },
        },
        scenes: {
          sc1: { id: 'sc1', title: 'Scene One', content: 'Once upon a time.' },
        },
      } as any,
      bible: null,
      sessions: null,
    });

    const service = new ExportService(mockRepository);
    const markdown = await service.exportProjectMarkdown('p1');
    expect(markdown).toContain('# My Novel');
    expect(markdown).toContain('## Chapter One');
    expect(markdown).toContain('### Scene One');
    expect(markdown).toContain('Once upon a time.');
  });
});
