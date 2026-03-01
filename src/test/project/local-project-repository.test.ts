import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cannotDeleteOnlyChapterCode,
  LocalProjectRepository,
  PROJECT_STORAGE_KEY,
} from '@/data/project/local-project-repository';
import { projectIdSchema, projectStorageSchema } from '@/domain/project/schemas';

const legacyProjectId = '11111111-1111-4111-8111-111111111111';

const createLegacyV1ProjectStorage = () => ({
  version: 1,
  projects: [
    {
      id: legacyProjectId,
      title: 'Legacy Project',
      description: 'Migrated from v1',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      stats: {
        wordCount: 10,
        sceneCount: 2,
        chapterCount: 1,
      },
      settings: {
        language: 'en',
        targetWordCount: 1000,
      },
    },
  ],
});

const createV2ProjectStorage = (sceneId: string) => ({
  version: 2,
  projects: [
    {
      id: legacyProjectId,
      title: 'V2 Project',
      description: 'Migrated from v2',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      stats: { wordCount: 5, sceneCount: 1, chapterCount: 0 },
      settings: { language: 'en', targetWordCount: null },
      sceneOrder: [sceneId],
      scenes: {
        [sceneId]: {
          id: sceneId,
          projectId: legacyProjectId,
          title: 'Scene 1',
          content: 'hello world',
          status: 'draft',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      },
    },
  ],
});

const getFirstScene = async (repository: LocalProjectRepository, projectId: string) => {
  const scenes = await repository.listScenes({ projectId });
  return scenes[0];
};

describe('LocalProjectRepository project storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates and persists a project with an initial scene in v3 storage', async () => {
    const repository = new LocalProjectRepository();

    const createdProject = await repository.create({
      title: 'Draft project',
      description: 'Initial version',
    });

    expect(projectIdSchema.safeParse(createdProject.id).success).toBe(true);
    expect(createdProject.chapterOrder).toHaveLength(1);
    expect(createdProject.stats.sceneCount).toBe(1);
    expect(createdProject.stats.chapterCount).toBe(1);

    const rawStorage = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    expect(rawStorage).toBeTruthy();

    const parsedStorage = projectStorageSchema.parse(JSON.parse(rawStorage ?? '{}'));
    expect(parsedStorage.version).toBe(3);
    expect(parsedStorage.projects).toHaveLength(1);
    expect(parsedStorage.projects[0]?.chapterOrder).toHaveLength(1);
  });

  it('lists projects sorted by updatedAt descending', async () => {
    vi.useFakeTimers();
    const repository = new LocalProjectRepository();

    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
    const projectAlpha = await repository.create({ title: 'Alpha', description: '' });

    vi.setSystemTime(new Date('2025-01-02T00:00:00.000Z'));
    const projectBeta = await repository.create({ title: 'Beta', description: '' });

    vi.setSystemTime(new Date('2025-01-03T00:00:00.000Z'));
    await repository.update(projectAlpha.id, { description: 'Updated alpha' });

    const projects = await repository.list();
    expect(projects.map((project) => project.id)).toEqual([projectAlpha.id, projectBeta.id]);
  });

  it('updates a project and refreshes updatedAt', async () => {
    vi.useFakeTimers();
    const repository = new LocalProjectRepository();

    vi.setSystemTime(new Date('2025-02-01T00:00:00.000Z'));
    const createdProject = await repository.create({
      title: 'Story',
      description: 'First description',
    });

    vi.setSystemTime(new Date('2025-02-02T00:00:00.000Z'));
    const updatedProject = await repository.update(createdProject.id, {
      title: 'Story Revised',
      description: 'Second description',
    });

    expect(updatedProject.title).toBe('Story Revised');
    expect(updatedProject.description).toBe('Second description');
    expect(new Date(updatedProject.updatedAt).getTime()).toBeGreaterThan(
      new Date(createdProject.updatedAt).getTime(),
    );
  });

  it('removes project safely and keeps remove idempotent for missing items', async () => {
    const repository = new LocalProjectRepository();
    const createdProject = await repository.create({
      title: 'Delete me',
      description: '',
    });

    await repository.remove(createdProject.id);
    await repository.remove(createdProject.id);

    const projects = await repository.list();
    expect(projects).toHaveLength(0);
  });

  it('migrates v1 project storage to v3 with default chapter and scene', async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(createLegacyV1ProjectStorage()));
    const repository = new LocalProjectRepository();

    const projects = await repository.list();
    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe(legacyProjectId);
    expect(projects[0]?.chapterOrder).toHaveLength(1);
    expect(projects[0]?.stats.sceneCount).toBe(1);
    expect(projects[0]?.stats.chapterCount).toBe(1);

    const rawStorage = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    const parsedStorage = projectStorageSchema.parse(JSON.parse(rawStorage ?? '{}'));
    expect(parsedStorage.version).toBe(3);
  });

  it('migrates v2 project storage to v3 wrapping all scenes into Chapter 1', async () => {
    const sceneId = 'legacy-scene-1';
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(createV2ProjectStorage(sceneId)));
    const repository = new LocalProjectRepository();

    const projects = await repository.list();
    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe(legacyProjectId);
    expect(projects[0]?.chapterOrder).toHaveLength(1);

    const firstChapterId = projects[0]!.chapterOrder[0]!;
    const firstChapter = projects[0]!.chapters[firstChapterId];
    expect(firstChapter?.title).toBe('Chapter 1');
    expect(firstChapter?.sceneOrder).toContain(sceneId);

    const rawStorage = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    const parsedStorage = projectStorageSchema.parse(JSON.parse(rawStorage ?? '{}'));
    expect(parsedStorage.version).toBe(3);
  });

  it('falls back to empty list when storage json is corrupted', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = new LocalProjectRepository();

    window.localStorage.setItem(PROJECT_STORAGE_KEY, '{broken-json');

    const projects = await repository.list();
    expect(projects).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('falls back to empty list when storage version is unsupported', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const repository = new LocalProjectRepository();

    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        version: 99,
        projects: [],
      }),
    );

    const projects = await repository.list();
    expect(projects).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('rejects invalid project input', async () => {
    const repository = new LocalProjectRepository();

    await expect(
      repository.create({
        title: ' ',
        description: 'Invalid',
      }),
    ).rejects.toThrow();
  });
});

describe('LocalProjectRepository chapter CRUD', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('createChapter appends to chapterOrder with correct projectId', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });

    const chapter = await repository.createChapter({ projectId: project.id, title: 'Act Two' });

    expect(chapter.projectId).toBe(project.id);
    expect(chapter.title).toBe('Act Two');

    const updated = await repository.getById(project.id);
    expect(updated?.chapterOrder).toContain(chapter.id);
    expect(updated?.stats.chapterCount).toBe(2);
  });

  it('renameChapter updates the chapter title', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;

    const renamed = await repository.renameChapter({
      projectId: project.id,
      chapterId,
      title: 'Prologue',
    });

    expect(renamed.title).toBe('Prologue');
    const updated = await repository.getById(project.id);
    expect(updated?.chapters[chapterId]?.title).toBe('Prologue');
  });

  it('deleteChapter moves scenes to adjacent chapter and removes it', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const firstChapterId = project.chapterOrder[0]!;
    const firstSceneId = project.chapters[firstChapterId]!.sceneOrder[0]!;

    const secondChapter = await repository.createChapter({
      projectId: project.id,
      title: 'Chapter 2',
    });

    await repository.deleteChapter({ projectId: project.id, chapterId: firstChapterId });

    const updated = await repository.getById(project.id);
    expect(updated?.chapterOrder).not.toContain(firstChapterId);
    expect(updated?.chapters[secondChapter.id]?.sceneOrder).toContain(firstSceneId);
    expect(updated?.stats.chapterCount).toBe(1);
  });

  it('deleteChapter refuses when only one chapter exists', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;

    await expect(
      repository.deleteChapter({ projectId: project.id, chapterId }),
    ).rejects.toThrow(cannotDeleteOnlyChapterCode);
  });

  it('reorderChapter moves chapter up', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const firstChapterId = project.chapterOrder[0]!;
    const secondChapter = await repository.createChapter({ projectId: project.id, title: 'Ch 2' });

    await repository.reorderChapter({
      projectId: project.id,
      chapterId: secondChapter.id,
      direction: 'up',
    });

    const updated = await repository.getById(project.id);
    expect(updated?.chapterOrder[0]).toBe(secondChapter.id);
    expect(updated?.chapterOrder[1]).toBe(firstChapterId);
  });

  it('reorderChapter is a no-op at boundaries', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;

    await repository.reorderChapter({ projectId: project.id, chapterId, direction: 'up' });

    const updated = await repository.getById(project.id);
    expect(updated?.chapterOrder[0]).toBe(chapterId);
  });

  it('moveSceneToChapter removes scene from source and appends to target', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const firstChapterId = project.chapterOrder[0]!;
    const sceneId = project.chapters[firstChapterId]!.sceneOrder[0]!;

    const secondChapter = await repository.createChapter({ projectId: project.id, title: 'Ch 2' });

    await repository.moveSceneToChapter({
      projectId: project.id,
      sceneId,
      targetChapterId: secondChapter.id,
    });

    const updated = await repository.getById(project.id);
    expect(updated?.chapters[firstChapterId]?.sceneOrder).not.toContain(sceneId);
    expect(updated?.chapters[secondChapter.id]?.sceneOrder).toContain(sceneId);
  });

  it('createScene with no chapterId appends to last chapter', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const firstChapterId = project.chapterOrder[0]!;

    const secondChapter = await repository.createChapter({ projectId: project.id, title: 'Ch 2' });

    const scene = await repository.createScene({ projectId: project.id, title: 'New Scene' });

    const updated = await repository.getById(project.id);
    expect(updated?.chapters[firstChapterId]?.sceneOrder).not.toContain(scene.id);
    expect(updated?.chapters[secondChapter.id]?.sceneOrder).toContain(scene.id);
  });

  it('listScenes returns flat ordered scene list across all chapters', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const firstChapterId = project.chapterOrder[0]!;
    const firstSceneId = project.chapters[firstChapterId]!.sceneOrder[0]!;

    const secondChapter = await repository.createChapter({ projectId: project.id, title: 'Ch 2' });
    const secondScene = await repository.createScene({
      projectId: project.id,
      title: 'Scene in Ch2',
      chapterId: secondChapter.id,
    });

    const scenes = await repository.listScenes({ projectId: project.id });
    expect(scenes.map((s) => s.id)).toEqual([firstSceneId, secondScene.id]);
  });

  it('loadScene returns correct prev/next across chapter boundaries', async () => {
    const repository = new LocalProjectRepository();
    const { SceneEditorService } = await import('@/application/scene/scene-editor-service');
    const service = new SceneEditorService(repository);

    const project = await repository.create({ title: 'Novel', description: '' });
    const firstChapterId = project.chapterOrder[0]!;
    const firstSceneId = project.chapters[firstChapterId]!.sceneOrder[0]!;

    const secondChapter = await repository.createChapter({ projectId: project.id, title: 'Ch 2' });
    const secondScene = await repository.createScene({
      projectId: project.id,
      title: 'Scene in Ch2',
      chapterId: secondChapter.id,
    });

    const result = await service.loadScene({ projectId: project.id, sceneId: firstSceneId });
    expect(result.state).toBe('ready');
    if (result.state === 'ready') {
      expect(result.previousSceneId).toBeNull();
      expect(result.nextSceneId).toBe(secondScene.id);
    }
  });

  it('v2 to v3 migration: creates Chapter 1 with all existing scenes', async () => {
    const sceneId = 'scene-abc-123';
    window.localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify(createV2ProjectStorage(sceneId)),
    );

    const repository = new LocalProjectRepository();
    const firstScene = await getFirstScene(repository, legacyProjectId);

    expect(firstScene).toBeDefined();
    expect(firstScene?.id).toBe(sceneId);

    const project = await repository.getById(legacyProjectId);
    const chapterId = project!.chapterOrder[0]!;
    expect(project!.chapters[chapterId]?.title).toBe('Chapter 1');
    expect(project!.chapters[chapterId]?.sceneOrder).toContain(sceneId);
  });
});
