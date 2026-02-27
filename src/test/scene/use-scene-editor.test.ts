import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ProjectScenesResult,
  SceneEditorServicePort,
  SceneLoadResult,
} from '@/application/scene/scene-editor-service';
import type { Scene } from '@/domain/scene/types';
import { useSceneEditor } from '@/hooks/use-scene-editor';

type DeferredPromise<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferredPromise = <T,>(): DeferredPromise<T> => {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
};

const createScene = (overrides: Partial<Scene> = {}): Scene => ({
  id: 'scene-1',
  projectId: 'demo-project',
  title: 'Scene 1',
  content: 'Initial content',
  status: 'draft',
  updatedAt: '2026-02-25T10:00:00.000Z',
  ...overrides,
});

const createServiceDouble = (options: {
  loadSceneResult?: SceneLoadResult;
  saveScene?: SceneEditorServicePort['saveScene'];
  toUserErrorMessage?: SceneEditorServicePort['toUserErrorMessage'];
}): SceneEditorServicePort => {
  const loadSceneResult =
    options.loadSceneResult ??
    ({
      state: 'ready',
      scene: createScene(),
      previousSceneId: null,
      nextSceneId: 'scene-2',
    } satisfies SceneLoadResult);

  return {
    loadScene: vi.fn().mockResolvedValue(loadSceneResult),
    listProjectScenes: vi
      .fn()
      .mockResolvedValue({ state: 'ready', scenes: [] } satisfies ProjectScenesResult),
    createScene: vi.fn().mockImplementation(async (input) =>
      createScene({
        id: 'scene-created',
        projectId: input.projectId,
        title: input.title,
        content: '',
        status: 'draft',
        updatedAt: '2026-02-25T10:00:00.000Z',
      }),
    ),
    saveScene:
      options.saveScene ??
      vi.fn().mockImplementation(async (input) =>
        createScene({
          content: input.content,
          status: input.status,
          updatedAt: input.updatedAt,
        }),
      ),
    countWords: vi.fn().mockImplementation((content: string) => {
      const trimmedContent = content.trim();
      return trimmedContent ? trimmedContent.split(/\s+/).length : 0;
    }),
    toUserErrorMessage:
      options.toUserErrorMessage ?? vi.fn().mockReturnValue('Unable to save scene. Retry.'),
  };
};

const flushAsyncState = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useSceneEditor autosave behavior', () => {
  it('autosaves scene content after 800ms of inactivity', async () => {
    const saveScene = vi.fn().mockImplementation(async (input) =>
      createScene({
        content: input.content,
        status: input.status,
        updatedAt: input.updatedAt,
      }),
    );

    const service = createServiceDouble({ saveScene });
    const { result } = renderHook(() =>
      useSceneEditor({
        projectId: 'demo-project',
        sceneId: 'scene-1',
        service,
      }),
    );

    await waitFor(() => {
      expect(result.current.loadState).toBe('ready');
    });

    vi.useFakeTimers();

    act(() => {
      result.current.setContent('alpha beta');
    });

    act(() => {
      vi.advanceTimersByTime(799);
    });
    expect(saveScene).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    await flushAsyncState();
    expect(saveScene).toHaveBeenCalledTimes(1);
  });

  it('does not save while typing continuously before debounce threshold', async () => {
    const saveScene = vi.fn().mockImplementation(async (input) =>
      createScene({
        content: input.content,
        status: input.status,
        updatedAt: input.updatedAt,
      }),
    );

    const service = createServiceDouble({ saveScene });
    const { result } = renderHook(() =>
      useSceneEditor({
        projectId: 'demo-project',
        sceneId: 'scene-1',
        service,
      }),
    );

    await waitFor(() => {
      expect(result.current.loadState).toBe('ready');
    });

    vi.useFakeTimers();

    act(() => {
      result.current.setContent('first draft');
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.setContent('first draft updated');
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(saveScene).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    await flushAsyncState();
    expect(saveScene).toHaveBeenCalledTimes(1);
  });
});

describe('useSceneEditor save recovery', () => {
  it('keeps dirty state after save failure and clears it after manual retry', async () => {
    const saveScene = vi
      .fn()
      .mockRejectedValueOnce(new Error('NETWORK_ERROR'))
      .mockImplementationOnce(async (input) =>
        createScene({
          content: input.content,
          status: input.status,
          updatedAt: input.updatedAt,
        }),
      );

    const service = createServiceDouble({ saveScene });
    const { result } = renderHook(() =>
      useSceneEditor({
        projectId: 'demo-project',
        sceneId: 'scene-1',
        service,
      }),
    );

    await waitFor(() => {
      expect(result.current.loadState).toBe('ready');
    });

    vi.useFakeTimers();

    act(() => {
      result.current.setContent('retry me');
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    await flushAsyncState();

    expect(result.current.saveError).toBe('Unable to save scene. Retry.');
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.retrySave();
    });
    await flushAsyncState();
    expect(result.current.saveError).toBeNull();
    expect(result.current.isDirty).toBe(false);
  });

  it('ignores obsolete save responses when requests resolve out of order', async () => {
    const firstSave = createDeferredPromise<Scene>();
    const secondSave = createDeferredPromise<Scene>();

    const saveScene = vi.fn().mockImplementation(() => {
      if (saveScene.mock.calls.length === 1) {
        return firstSave.promise;
      }

      return secondSave.promise;
    });

    const service = createServiceDouble({ saveScene });
    const { result } = renderHook(() =>
      useSceneEditor({
        projectId: 'demo-project',
        sceneId: 'scene-1',
        service,
      }),
    );

    await waitFor(() => {
      expect(result.current.loadState).toBe('ready');
    });

    vi.useFakeTimers();

    act(() => {
      result.current.setContent('first version');
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });

    act(() => {
      result.current.setContent('second version');
    });
    act(() => {
      vi.advanceTimersByTime(800);
    });

    await act(async () => {
      secondSave.resolve(
        createScene({
          content: 'second version',
          updatedAt: '2026-02-25T10:01:00.000Z',
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.lastSavedAt).toBe('2026-02-25T10:01:00.000Z');

    await act(async () => {
      firstSave.resolve(
        createScene({
          content: 'first version',
          updatedAt: '2026-02-25T10:00:30.000Z',
        }),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.lastSavedAt).toBe('2026-02-25T10:01:00.000Z');
    expect(result.current.scene?.content).toBe('second version');
  });
});

describe('useSceneEditor load state', () => {
  it('sets a terminal error state when scene loading throws', async () => {
    const service = createServiceDouble({});
    const loadFailure = new Error('LOAD_FAILURE');
    vi.mocked(service.loadScene).mockRejectedValueOnce(loadFailure);
    vi.mocked(service.toUserErrorMessage).mockReturnValueOnce('Unable to load scene.');

    const { result } = renderHook(() =>
      useSceneEditor({
        projectId: 'demo-project',
        sceneId: 'scene-1',
        service,
      }),
    );

    await waitFor(() => {
      expect(result.current.loadState).toBe('error');
    });
    expect(result.current.saveError).toBe('Unable to load scene.');
  });
});
