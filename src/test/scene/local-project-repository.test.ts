import { describe, expect, it } from 'vitest';

import {
  LocalProjectRepository,
  workspaceStorageKey,
} from '@/data/project/local-project-repository';
import { maxSceneContentLength } from '@/domain/scene/schemas';

const buildLegacyWorkspaceStore = (projectId: string) => ({
  version: 1,
  projects: {
    [projectId]: {
      id: projectId,
      title: 'Legacy Scene Project',
      sceneOrder: ['legacy-scene-1'],
      scenes: {
        'legacy-scene-1': {
          id: 'legacy-scene-1',
          projectId,
          title: 'Legacy Scene 1',
          content: 'Legacy imported content',
          status: 'revise',
          updatedAt: '2026-02-25T12:00:00.000Z',
        },
      },
    },
  },
});

describe('LocalProjectRepository scene storage', () => {
  it('creates a new scene and appends it to sceneOrder', async () => {
    window.localStorage.clear();
    const repository = new LocalProjectRepository();
    const project = await repository.create({
      title: 'Project with scenes',
      description: '',
    });

    const createdScene = await repository.createScene({
      projectId: project.id,
      title: 'Second Scene',
    });

    const updatedProject = await repository.getById(project.id);
    expect(updatedProject).not.toBeNull();
    expect(updatedProject?.sceneOrder.includes(createdScene.id)).toBe(true);
    expect(updatedProject?.stats.sceneCount).toBe(2);
  });

  it('persists scene content and status across repository instances', async () => {
    window.localStorage.clear();
    const repository = new LocalProjectRepository();
    const project = await repository.create({
      title: 'Persisted scene project',
      description: '',
    });
    const sceneId = project.sceneOrder[0]!;
    const updatedAt = '2026-02-25T12:10:00.000Z';

    await repository.saveScene({
      projectId: project.id,
      sceneId,
      content: 'Updated markdown body.',
      status: 'final',
      updatedAt,
    });

    const reloadedRepository = new LocalProjectRepository();
    const scene = await reloadedRepository.getScene({
      projectId: project.id,
      sceneId,
    });

    expect(scene).not.toBeNull();
    expect(scene?.content).toBe('Updated markdown body.');
    expect(scene?.status).toBe('final');
    expect(scene?.updatedAt).toBe(updatedAt);
  });

  it('rejects content larger than the allowed size', async () => {
    window.localStorage.clear();
    const repository = new LocalProjectRepository();
    const project = await repository.create({
      title: 'Size limited project',
      description: '',
    });
    const sceneId = project.sceneOrder[0]!;
    const oversizedContent = 'a'.repeat(maxSceneContentLength + 1);

    await expect(
      repository.saveScene({
        projectId: project.id,
        sceneId,
        content: oversizedContent,
        status: 'draft',
        updatedAt: '2026-02-25T12:10:00.000Z',
      }),
    ).rejects.toThrow();
  });

  it('imports legacy workspace scenes into an existing project id', async () => {
    window.localStorage.clear();
    const repository = new LocalProjectRepository();
    const project = await repository.create({
      title: 'Existing target project',
      description: '',
    });

    window.localStorage.setItem(
      workspaceStorageKey,
      JSON.stringify(buildLegacyWorkspaceStore(project.id)),
    );

    const scenes = await repository.listScenes({ projectId: project.id });
    const sceneTitles = scenes.map((scene) => scene.title);

    expect(sceneTitles).toContain('Legacy Scene 1');
    expect(scenes.length).toBe(2);
    expect(window.localStorage.getItem(workspaceStorageKey)).toBeNull();
  });

  it('creates an imported project when only demo legacy workspace exists', async () => {
    window.localStorage.clear();
    const repository = new LocalProjectRepository();

    window.localStorage.setItem(
      workspaceStorageKey,
      JSON.stringify(buildLegacyWorkspaceStore('demo-project')),
    );

    const projects = await repository.list();
    expect(projects).toHaveLength(1);
    expect(projects[0]?.title).toBe('Imported Demo Project');

    const importedProjectId = projects[0]?.id;
    expect(importedProjectId).toBeTruthy();
    if (!importedProjectId) {
      throw new Error('Imported project id is required');
    }

    const scenes = await repository.listScenes({ projectId: importedProjectId });
    expect(scenes).toHaveLength(1);
    expect(scenes[0]?.title).toBe('Legacy Scene 1');
  });
});
