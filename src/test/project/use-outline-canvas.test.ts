import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ChapterService } from '@/application/project/chapter-service';
import type { ProjectService } from '@/application/project/project-service';
import type { SceneEditorServicePort } from '@/application/scene/scene-editor-service';
import type { ProjectScene, WritingProject } from '@/domain/project/types';
import { useOutlineCanvas } from '@/hooks/use-outline-canvas';

const projectId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const chapterId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const sceneId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const sceneId2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const createScene = (id: string, overrides: Partial<ProjectScene> = {}): ProjectScene => ({
  id,
  projectId,
  title: `Scene ${id.slice(0, 4)}`,
  content: '',
  status: 'draft',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const createProject = (overrides: Partial<WritingProject> = {}): WritingProject => ({
  id: projectId,
  title: 'Test Novel',
  description: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  stats: { wordCount: 0, sceneCount: 2, chapterCount: 1 },
  settings: { language: 'en', targetWordCount: null },
  chapterOrder: [chapterId],
  chapters: {
    [chapterId]: {
      id: chapterId,
      projectId,
      title: 'Chapter 1',
      sceneOrder: [sceneId, sceneId2],
      wordCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  },
  scenes: {
    [sceneId]: createScene(sceneId),
    [sceneId2]: createScene(sceneId2),
  },
  ...overrides,
});

const createProjectService = (project: WritingProject | null = createProject()): ProjectService => ({
  listProjects: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue(project),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
});

const createChapterService = (): ChapterService => ({
  listChapters: vi.fn().mockResolvedValue([]),
  createChapter: vi.fn().mockResolvedValue({ id: 'new-chapter', projectId, title: 'New', sceneOrder: [], wordCount: 0, createdAt: '' }),
  renameChapter: vi.fn().mockResolvedValue({}),
  deleteChapter: vi.fn().mockResolvedValue(undefined),
  reorderChapter: vi.fn().mockResolvedValue(undefined),
  moveSceneToChapter: vi.fn().mockResolvedValue(undefined),
  reorderScene: vi.fn().mockResolvedValue(undefined),
  updateSceneInline: vi.fn().mockImplementation(async (input) =>
    createScene(input.sceneId, { title: input.title ?? `Scene ${input.sceneId.slice(0, 4)}`, status: input.status ?? 'draft' }),
  ),
});

const createSceneService = (): SceneEditorServicePort => ({
  loadScene: vi.fn(),
  listProjectScenes: vi.fn(),
  createScene: vi.fn().mockResolvedValue(createScene('new-scene')),
  saveScene: vi.fn(),
  countWords: vi.fn().mockReturnValue(0),
  toUserErrorMessage: vi.fn(),
});

const renderCanvas = (overrides?: { project?: WritingProject | null }) => {
  const hasProjectOverride = overrides !== undefined && 'project' in overrides;
  const projectData = hasProjectOverride ? overrides!.project : createProject();
  const projectService = createProjectService(projectData ?? null);
  const chapterService = createChapterService();
  const sceneService = createSceneService();

  const { result } = renderHook(() =>
    useOutlineCanvas({ projectId, projectService, chapterService, sceneService }),
  );

  return { result, projectService, chapterService, sceneService };
};

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useOutlineCanvas', () => {
  it('loads project on mount and sets loadState to ready', async () => {
    const { result } = renderCanvas();

    await waitFor(() => {
      expect(result.current.loadState).toBe('ready');
    });

    expect(result.current.project?.id).toBe(projectId);
  });

  it('sets loadState to not-found when project is null', async () => {
    const { result } = renderCanvas({ project: null });

    await waitFor(() => {
      expect(result.current.loadState).toBe('not-found');
    });
  });

  it('applies optimistic reorder immediately on handleDrop', async () => {
    const { result } = renderCanvas();

    await waitFor(() => {
      expect(result.current.loadState).toBe('ready');
    });

    act(() => {
      result.current.handleDragStart({ sceneId, sourceChapterId: chapterId, sourceIndex: 0 });
    });

    await act(async () => {
      await result.current.handleDrop(chapterId, 1);
    });

    const order = result.current.project!.chapters[chapterId]!.sceneOrder;
    expect(order[0]).toBe(sceneId2);
    expect(order[1]).toBe(sceneId);
  });

  it('reverts to previous state when reorderScene service call fails', async () => {
    const { result, chapterService } = renderCanvas();

    await waitFor(() => {
      expect(result.current.loadState).toBe('ready');
    });

    vi.mocked(chapterService.reorderScene).mockRejectedValueOnce(new Error('Network error'));

    act(() => {
      result.current.handleDragStart({ sceneId, sourceChapterId: chapterId, sourceIndex: 0 });
    });

    await act(async () => {
      await result.current.handleDrop(chapterId, 1);
    });

    const order = result.current.project!.chapters[chapterId]!.sceneOrder;
    expect(order[0]).toBe(sceneId);
    expect(order[1]).toBe(sceneId2);
    expect(result.current.actionError).toBe('Network error');
  });

  it('debounces inline edit calls to updateSceneInline', async () => {
    const { result, chapterService } = renderCanvas();

    await waitFor(() => {
      expect(result.current.loadState).toBe('ready');
    });

    vi.useFakeTimers();

    act(() => {
      result.current.handleInlineEdit(sceneId, { title: 'Draft A' });
      result.current.handleInlineEdit(sceneId, { title: 'Draft B' });
      result.current.handleInlineEdit(sceneId, { title: 'Final Title' });
    });

    expect(chapterService.updateSceneInline).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(chapterService.updateSceneInline).toHaveBeenCalledTimes(1);
    expect(chapterService.updateSceneInline).toHaveBeenCalledWith(
      expect.objectContaining({ sceneId, title: 'Final Title' }),
    );
  });

  it('calls createScene and reloads project on handleCreateScene', async () => {
    const { result, projectService, sceneService } = renderCanvas();

    await waitFor(() => {
      expect(result.current.loadState).toBe('ready');
    });

    await act(async () => {
      await result.current.handleCreateScene(chapterId, 'New Scene');
    });

    expect(sceneService.createScene).toHaveBeenCalledWith(
      expect.objectContaining({ projectId, chapterId, title: 'New Scene' }),
    );
    expect(projectService.getProjectById).toHaveBeenCalledTimes(2);
  });

  it('sets actionError when a service call throws', async () => {
    const { result, sceneService } = renderCanvas();

    await waitFor(() => {
      expect(result.current.loadState).toBe('ready');
    });

    vi.mocked(sceneService.createScene).mockRejectedValueOnce(new Error('Disk full'));

    await act(async () => {
      await result.current.handleCreateScene(chapterId, 'Broken Scene').catch(() => {});
    });

    expect(result.current.actionError).toBe('Disk full');
  });
});
