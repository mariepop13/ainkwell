import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  chapterNotFoundCode,
  LocalProjectRepository,
  sceneNotFoundCode,
} from '@/data/project/local-project-repository';

describe('LocalProjectRepository reorderScene', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reorders a scene within the same chapter to a lower index', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;

    const sceneB = await repository.createScene({ projectId: project.id, title: 'Scene B', chapterId });
    const sceneC = await repository.createScene({ projectId: project.id, title: 'Scene C', chapterId });

    const updated = await repository.getById(project.id);
    const originalFirst = updated!.chapters[chapterId]!.sceneOrder[0]!;

    await repository.reorderScene({
      projectId: project.id,
      sceneId: sceneC.id,
      targetChapterId: chapterId,
      targetIndex: 0,
    });

    const result = await repository.getById(project.id);
    expect(result!.chapters[chapterId]!.sceneOrder[0]).toBe(sceneC.id);
    expect(result!.chapters[chapterId]!.sceneOrder).toContain(originalFirst);
    expect(result!.chapters[chapterId]!.sceneOrder).toContain(sceneB.id);
  });

  it('reorders a scene within the same chapter to a higher index', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;
    const firstSceneId = project.chapters[chapterId]!.sceneOrder[0]!;

    await repository.createScene({ projectId: project.id, title: 'Scene B', chapterId });

    await repository.reorderScene({
      projectId: project.id,
      sceneId: firstSceneId,
      targetChapterId: chapterId,
      targetIndex: 2,
    });

    const result = await repository.getById(project.id);
    const order = result!.chapters[chapterId]!.sceneOrder;
    expect(order[order.length - 1]).toBe(firstSceneId);
  });

  it('moves a scene from one chapter to another at a specific index', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const ch1 = project.chapterOrder[0]!;
    const sceneId = project.chapters[ch1]!.sceneOrder[0]!;

    const ch2 = await repository.createChapter({ projectId: project.id, title: 'Chapter 2' });
    await repository.createScene({ projectId: project.id, title: 'Ch2 Scene 1', chapterId: ch2.id });

    await repository.reorderScene({
      projectId: project.id,
      sceneId,
      targetChapterId: ch2.id,
      targetIndex: 0,
    });

    const result = await repository.getById(project.id);
    expect(result!.chapters[ch1]!.sceneOrder).not.toContain(sceneId);
    expect(result!.chapters[ch2.id]!.sceneOrder[0]).toBe(sceneId);
  });

  it('clamps targetIndex to the end when index exceeds scene count', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const ch1 = project.chapterOrder[0]!;
    const sceneId = project.chapters[ch1]!.sceneOrder[0]!;

    const ch2 = await repository.createChapter({ projectId: project.id, title: 'Chapter 2' });

    await repository.reorderScene({
      projectId: project.id,
      sceneId,
      targetChapterId: ch2.id,
      targetIndex: 999,
    });

    const result = await repository.getById(project.id);
    const order = result!.chapters[ch2.id]!.sceneOrder;
    expect(order[order.length - 1]).toBe(sceneId);
  });

  it('is a no-op when scene is moved to its current position', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;
    const firstSceneId = project.chapters[chapterId]!.sceneOrder[0]!;
    const sceneB = await repository.createScene({ projectId: project.id, title: 'Scene B', chapterId });

    await repository.reorderScene({
      projectId: project.id,
      sceneId: firstSceneId,
      targetChapterId: chapterId,
      targetIndex: 0,
    });

    const result = await repository.getById(project.id);
    expect(result!.chapters[chapterId]!.sceneOrder[0]).toBe(firstSceneId);
    expect(result!.chapters[chapterId]!.sceneOrder[1]).toBe(sceneB.id);
  });

  it('throws SCENE_NOT_FOUND when sceneId does not exist', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;

    await expect(
      repository.reorderScene({
        projectId: project.id,
        sceneId: 'non-existent-scene',
        targetChapterId: chapterId,
        targetIndex: 0,
      }),
    ).rejects.toThrow(sceneNotFoundCode);
  });

  it('throws CHAPTER_NOT_FOUND when targetChapterId does not exist', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;
    const sceneId = project.chapters[chapterId]!.sceneOrder[0]!;

    await expect(
      repository.reorderScene({
        projectId: project.id,
        sceneId,
        targetChapterId: 'non-existent-chapter',
        targetIndex: 0,
      }),
    ).rejects.toThrow(chapterNotFoundCode);
  });

  it('recalculates chapter word counts after reorder', async () => {
    vi.useFakeTimers();
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const ch1 = project.chapterOrder[0]!;
    const sceneId = project.chapters[ch1]!.sceneOrder[0]!;

    await repository.saveScene({
      projectId: project.id,
      sceneId,
      content: 'hello world foo bar',
      status: 'draft',
      updatedAt: new Date().toISOString(),
    });

    const ch2 = await repository.createChapter({ projectId: project.id, title: 'Chapter 2' });

    await repository.reorderScene({
      projectId: project.id,
      sceneId,
      targetChapterId: ch2.id,
      targetIndex: 0,
    });

    const result = await repository.getById(project.id);
    expect(result!.chapters[ch1]!.wordCount).toBe(0);
    expect(result!.chapters[ch2.id]!.wordCount).toBeGreaterThan(0);
  });
});

describe('LocalProjectRepository updateSceneInline', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates title only', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;
    const sceneId = project.chapters[chapterId]!.sceneOrder[0]!;

    const result = await repository.updateSceneInline({
      projectId: project.id,
      sceneId,
      title: 'New Title',
    });

    expect(result.title).toBe('New Title');
    expect(result.status).toBe('draft');
  });

  it('updates status only', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;
    const sceneId = project.chapters[chapterId]!.sceneOrder[0]!;

    const result = await repository.updateSceneInline({
      projectId: project.id,
      sceneId,
      status: 'final',
    });

    expect(result.status).toBe('final');
  });

  it('updates synopsis only', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;
    const sceneId = project.chapters[chapterId]!.sceneOrder[0]!;

    const result = await repository.updateSceneInline({
      projectId: project.id,
      sceneId,
      synopsis: 'A brief overview.',
    });

    expect(result.synopsis).toBe('A brief overview.');
  });

  it('updates all three fields in one call', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;
    const sceneId = project.chapters[chapterId]!.sceneOrder[0]!;

    const result = await repository.updateSceneInline({
      projectId: project.id,
      sceneId,
      title: 'Climax',
      status: 'revise',
      synopsis: 'The confrontation.',
    });

    expect(result.title).toBe('Climax');
    expect(result.status).toBe('revise');
    expect(result.synopsis).toBe('The confrontation.');
  });

  it('does not mutate beats or content', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;
    const sceneId = project.chapters[chapterId]!.sceneOrder[0]!;

    await repository.saveScene({
      projectId: project.id,
      sceneId,
      content: 'The original content.',
      status: 'draft',
      updatedAt: new Date().toISOString(),
    });

    const result = await repository.updateSceneInline({
      projectId: project.id,
      sceneId,
      title: 'Updated',
    });

    expect(result.content).toBe('The original content.');
  });

  it('updates updatedAt timestamp', async () => {
    vi.useFakeTimers();
    const repository = new LocalProjectRepository();

    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const project = await repository.create({ title: 'Novel', description: '' });
    const chapterId = project.chapterOrder[0]!;
    const sceneId = project.chapters[chapterId]!.sceneOrder[0]!;

    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const result = await repository.updateSceneInline({
      projectId: project.id,
      sceneId,
      title: 'Updated',
    });

    expect(result.updatedAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('throws SCENE_NOT_FOUND for unknown sceneId', async () => {
    const repository = new LocalProjectRepository();
    const project = await repository.create({ title: 'Novel', description: '' });

    await expect(
      repository.updateSceneInline({
        projectId: project.id,
        sceneId: 'ghost-scene',
        title: 'No such scene',
      }),
    ).rejects.toThrow(sceneNotFoundCode);
  });
});
