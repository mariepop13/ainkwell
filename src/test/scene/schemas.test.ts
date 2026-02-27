import { describe, expect, it } from 'vitest';

import {
  projectStoreSchema,
  saveSceneInputSchema,
  sceneSchema,
} from '@/domain/scene/schemas';

const validProjectId = '11111111-1111-4111-8111-111111111111';

const createScene = (projectId: string, sceneId = 'scene-1') => ({
  id: sceneId,
  projectId,
  title: 'Scene 1',
  content: 'hello world',
  status: 'draft' as const,
  updatedAt: '2026-02-27T00:00:00.000Z',
});

describe('scene schemas', () => {
  it('accepts valid uuid project ids for scene and save payload', () => {
    expect(sceneSchema.safeParse(createScene(validProjectId)).success).toBe(true);
    expect(
      saveSceneInputSchema.safeParse({
        projectId: validProjectId,
        sceneId: 'scene-1',
        content: 'hello world',
        status: 'draft',
        updatedAt: '2026-02-27T00:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid project ids for scene and save payload', () => {
    expect(sceneSchema.safeParse(createScene('demo-project')).success).toBe(false);
    expect(
      saveSceneInputSchema.safeParse({
        projectId: 'demo-project',
        sceneId: 'scene-1',
        content: 'hello world',
        status: 'draft',
        updatedAt: '2026-02-27T00:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('keeps legacy workspace schema compatible while rejecting duplicate/orphan scene references', () => {
    const duplicateOrder = projectStoreSchema.safeParse({
      id: 'demo-project',
      title: 'Legacy',
      sceneOrder: ['scene-1', 'scene-1'],
      scenes: {
        'scene-1': createScene('demo-project', 'scene-1'),
      },
    });

    const orphanScene = projectStoreSchema.safeParse({
      id: 'demo-project',
      title: 'Legacy',
      sceneOrder: ['scene-1'],
      scenes: {
        'scene-1': createScene('demo-project', 'scene-1'),
        'scene-2': createScene('demo-project', 'scene-2'),
      },
    });

    expect(duplicateOrder.success).toBe(false);
    expect(orphanScene.success).toBe(false);
  });
});
