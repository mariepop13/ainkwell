import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectIdSchema, projectStorageSchema } from '@/domain/project/schemas';
import {
  LocalProjectRepository,
  PROJECT_STORAGE_KEY,
} from '@/data/project/local-project-repository';

describe('LocalProjectRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('creates and persists a valid project', async () => {
    const repository = new LocalProjectRepository();

    const createdProject = await repository.create({
      title: 'Draft project',
      description: 'Initial version',
    });

    expect(projectIdSchema.safeParse(createdProject.id).success).toBe(true);
    expect(createdProject.title).toBe('Draft project');
    expect(createdProject.description).toBe('Initial version');

    const rawStorage = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    expect(rawStorage).toBeTruthy();

    const parsedStorage = projectStorageSchema.parse(JSON.parse(rawStorage ?? '{}'));
    expect(parsedStorage.projects).toHaveLength(1);
    expect(parsedStorage.projects[0]?.id).toBe(createdProject.id);
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

    vi.useRealTimers();
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

    vi.useRealTimers();
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
        version: 2,
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
