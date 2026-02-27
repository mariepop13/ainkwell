import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SceneEditorServicePort } from '@/application/scene/scene-editor-service';
import { SceneEditorShell } from '@/components/scene/scene-editor-shell';
import type { Scene } from '@/domain/scene/types';

const createScene = (overrides: Partial<Scene> = {}): Scene => ({
  id: 'scene-1',
  projectId: 'demo-project',
  title: 'Scene 1',
  content: 'hello world',
  status: 'draft',
  updatedAt: '2026-02-25T10:00:00.000Z',
  ...overrides,
});

const createServiceDouble = (options: {
  saveScene?: SceneEditorServicePort['saveScene'];
  toUserErrorMessage?: SceneEditorServicePort['toUserErrorMessage'];
}): SceneEditorServicePort => ({
  loadScene: vi.fn().mockResolvedValue({
    state: 'ready',
    scene: createScene(),
    previousSceneId: null,
    nextSceneId: 'scene-2',
  }),
  listProjectScenes: vi.fn().mockResolvedValue({ state: 'ready', scenes: [] }),
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
});

describe('SceneEditorShell', () => {
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

  it('updates word count when scene content changes', async () => {
    const service = createServiceDouble({});

    render(<SceneEditorShell projectId="demo-project" sceneId="scene-1" service={service} />);

    await screen.findByText('Scene 1');
    expect(screen.getByText('2 words')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Markdown content'), {
      target: { value: 'one two three' },
    });

    expect(screen.getByText('3 words')).toBeInTheDocument();
  });

  it('sends updated status in autosave payload', async () => {
    const saveScene = vi.fn().mockImplementation(async (input) =>
      createScene({
        content: input.content,
        status: input.status,
        updatedAt: input.updatedAt,
      }),
    );
    const service = createServiceDouble({ saveScene });

    render(<SceneEditorShell projectId="demo-project" sceneId="scene-1" service={service} />);
    await screen.findByText('Scene 1');
    vi.useFakeTimers();

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'revise' },
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });
    await flushAsyncState();
    expect(saveScene).toHaveBeenCalledTimes(1);
    expect(saveScene.mock.calls[0]?.[0].status).toBe('revise');
  });

  it('shows save error and retries manually', async () => {
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

    render(<SceneEditorShell projectId="demo-project" sceneId="scene-1" service={service} />);
    await screen.findByText('Scene 1');
    vi.useFakeTimers();

    fireEvent.change(screen.getByLabelText('Markdown content'), {
      target: { value: 'new markdown value' },
    });

    act(() => {
      vi.advanceTimersByTime(800);
    });
    await flushAsyncState();
    expect(screen.getByText('Unable to save scene. Retry.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await flushAsyncState();
    expect(saveScene).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Unable to save scene. Retry.')).not.toBeInTheDocument();
  });
});
