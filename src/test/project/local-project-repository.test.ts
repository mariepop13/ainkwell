import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalProjectRepository, PROJECT_STORAGE_KEY } from '@/data/project/local-project-repository';
import { projectIdSchema, projectStorageSchema } from '@/domain/project/schemas';

const legacyProjectId = '11111111-1111-4111-8111-111111111111';

const createLegacyProjectStorage = () => ({
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

describe('LocalProjectRepository project storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates and persists a project with an initial scene in v2 storage', async () => {
    const repository = new LocalProjectRepository();

    const createdProject = await repository.create({
      title: 'Draft project',
      description: 'Initial version',
    });

    expect(projectIdSchema.safeParse(createdProject.id).success).toBe(true);
    expect(createdProject.sceneOrder).toHaveLength(1);
    expect(createdProject.stats.sceneCount).toBe(1);

    const rawStorage = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    expect(rawStorage).toBeTruthy();

    const parsedStorage = projectStorageSchema.parse(JSON.parse(rawStorage ?? '{}'));
    expect(parsedStorage.version).toBe(2);
    expect(parsedStorage.projects).toHaveLength(1);
    expect(parsedStorage.projects[0]?.sceneOrder).toHaveLength(1);
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

  it('migrates v1 project storage to v2 with default scene data', async () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(createLegacyProjectStorage()));
    const repository = new LocalProjectRepository();

    const projects = await repository.list();
    expect(projects).toHaveLength(1);
    expect(projects[0]?.id).toBe(legacyProjectId);
    expect(projects[0]?.sceneOrder).toHaveLength(1);
    expect(projects[0]?.stats.sceneCount).toBe(1);

    const rawStorage = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    const parsedStorage = projectStorageSchema.parse(JSON.parse(rawStorage ?? '{}'));
    expect(parsedStorage.version).toBe(2);
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
