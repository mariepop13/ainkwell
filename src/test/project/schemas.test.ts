import { describe, expect, it } from 'vitest';

import { writingProjectSchema } from '@/domain/project/schemas';

const projectId = '11111111-1111-4111-8111-111111111111';
const chapterId = 'chapter-1';

const createProjectScene = (sceneId: string) => ({
  id: sceneId,
  projectId,
  title: `Scene ${sceneId}`,
  content: 'scene content',
  status: 'draft' as const,
  updatedAt: '2026-02-27T00:00:00.000Z',
});

const createProjectChapter = (overrides?: { sceneOrder?: string[] }) => ({
  id: chapterId,
  projectId,
  title: 'Chapter 1',
  sceneOrder: overrides?.sceneOrder ?? ['scene-1'],
  wordCount: 2,
  createdAt: '2026-02-27T00:00:00.000Z',
});

const createValidProject = () => ({
  id: projectId,
  title: 'Valid Project',
  description: 'Schema checks',
  createdAt: '2026-02-27T00:00:00.000Z',
  updatedAt: '2026-02-27T00:00:00.000Z',
  stats: {
    wordCount: 2,
    sceneCount: 1,
    chapterCount: 1,
  },
  settings: {
    language: 'en',
    targetWordCount: null,
  },
  chapterOrder: [chapterId],
  chapters: {
    [chapterId]: createProjectChapter(),
  },
  scenes: {
    'scene-1': createProjectScene('scene-1'),
  },
});

describe('writingProjectSchema graph integrity', () => {
  it('accepts a well-formed project with one chapter and one scene', () => {
    const result = writingProjectSchema.safeParse(createValidProject());
    expect(result.success).toBe(true);
  });

  it('rejects project where chapterOrder references non-existent chapter', () => {
    const project = createValidProject();
    project.chapterOrder = ['nonexistent-chapter'];

    const result = writingProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it('rejects project where a chapter is missing from chapterOrder', () => {
    const project = createValidProject();
    project.chapters['extra-chapter'] = {
      id: 'extra-chapter',
      projectId,
      title: 'Extra Chapter',
      sceneOrder: [],
      wordCount: 0,
      createdAt: '2026-02-27T00:00:00.000Z',
    };

    const result = writingProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it('rejects project where a scene appears in two different chapters', () => {
    const secondChapterId = 'chapter-2';
    const project = createValidProject();
    project.chapterOrder = [chapterId, secondChapterId];
    project.chapters[secondChapterId] = {
      id: secondChapterId,
      projectId,
      title: 'Chapter 2',
      sceneOrder: ['scene-1'],
      wordCount: 0,
      createdAt: '2026-02-27T00:00:00.000Z',
    };

    const result = writingProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it('rejects orphan scenes missing from all chapter sceneOrders', () => {
    const project = createValidProject();
    project.scenes['scene-2'] = createProjectScene('scene-2');

    const result = writingProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it('rejects duplicate scene references within a chapter', () => {
    const project = createValidProject();
    project.chapters[chapterId] = createProjectChapter({ sceneOrder: ['scene-1', 'scene-1'] });

    const result = writingProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed project with multiple chapters', () => {
    const secondChapterId = 'chapter-2';
    const project = createValidProject();
    project.chapterOrder = [chapterId, secondChapterId];
    project.chapters[secondChapterId] = {
      id: secondChapterId,
      projectId,
      title: 'Chapter 2',
      sceneOrder: ['scene-2'],
      wordCount: 0,
      createdAt: '2026-02-27T00:00:00.000Z',
    };
    project.scenes['scene-2'] = createProjectScene('scene-2');
    project.stats.sceneCount = 2;
    project.stats.chapterCount = 2;

    const result = writingProjectSchema.safeParse(project);
    expect(result.success).toBe(true);
  });
});
