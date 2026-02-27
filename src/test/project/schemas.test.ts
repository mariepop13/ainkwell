import { describe, expect, it } from 'vitest';

import { writingProjectSchema } from '@/domain/project/schemas';

const projectId = '11111111-1111-4111-8111-111111111111';

const createProjectScene = (sceneId: string) => ({
  id: sceneId,
  projectId,
  title: `Scene ${sceneId}`,
  content: 'scene content',
  status: 'draft' as const,
  updatedAt: '2026-02-27T00:00:00.000Z',
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
    chapterCount: 0,
  },
  settings: {
    language: 'en',
    targetWordCount: null,
  },
  sceneOrder: ['scene-1'],
  scenes: {
    'scene-1': createProjectScene('scene-1'),
  },
});

describe('writingProjectSchema graph integrity', () => {
  it('rejects duplicate scene references in sceneOrder', () => {
    const project = createValidProject();
    project.sceneOrder = ['scene-1', 'scene-1'];

    const result = writingProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });

  it('rejects orphan scenes missing from sceneOrder', () => {
    const project = createValidProject();
    project.scenes['scene-2'] = createProjectScene('scene-2');

    const result = writingProjectSchema.safeParse(project);
    expect(result.success).toBe(false);
  });
});
