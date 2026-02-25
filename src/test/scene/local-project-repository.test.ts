import { describe, expect, it } from 'vitest';

import { LocalProjectRepository } from '@/data/project/local-project-repository';
import { maxSceneContentLength } from '@/domain/scene/schemas';

describe('LocalProjectRepository', () => {
  it('seeds the demo project when storage is empty', async () => {
    window.localStorage.clear();
    const repository = new LocalProjectRepository();

    const scenes = await repository.listScenes({ projectId: 'demo-project' });

    expect(scenes).toHaveLength(3);
    expect(scenes.map((scene) => scene.id)).toEqual(['scene-1', 'scene-2', 'scene-3']);
  });

  it('persists scene content and status across repository instances', async () => {
    window.localStorage.clear();
    const repository = new LocalProjectRepository();
    const updatedAt = '2026-02-25T12:00:00.000Z';

    await repository.saveScene({
      projectId: 'demo-project',
      sceneId: 'scene-1',
      content: 'Updated markdown body.',
      status: 'final',
      updatedAt,
    });

    const reloadedRepository = new LocalProjectRepository();
    const scene = await reloadedRepository.getScene({
      projectId: 'demo-project',
      sceneId: 'scene-1',
    });

    expect(scene).not.toBeNull();
    expect(scene?.content).toBe('Updated markdown body.');
    expect(scene?.status).toBe('final');
    expect(scene?.updatedAt).toBe(updatedAt);
  });

  it('rejects content larger than the allowed size', async () => {
    window.localStorage.clear();
    const repository = new LocalProjectRepository();
    const oversizedContent = 'a'.repeat(maxSceneContentLength + 1);

    await expect(
      repository.saveScene({
        projectId: 'demo-project',
        sceneId: 'scene-1',
        content: oversizedContent,
        status: 'draft',
        updatedAt: '2026-02-25T12:10:00.000Z',
      }),
    ).rejects.toThrow();
  });
});
