import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCodexContext } from '@/hooks/use-codex-context';
import type { BibleService } from '@/application/bible/bible-service';
import type { BibleEntity } from '@/domain/bible/bible';

describe('useCodexContext', () => {
  const makeEntity = (name: string): BibleEntity => ({
    id: `e-${name}`, projectId: 'p1', category: 'character', name,
    summary: `Summary of ${name}`, details: '', tags: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  it('returns empty array when content is empty', async () => {
    const mockService = {
      listEntities: vi.fn().mockResolvedValue([makeEntity('Aria')]),
    } as unknown as BibleService;

    const { result } = renderHook(() =>
      useCodexContext({ projectId: 'p1', content: '', service: mockService }),
    );
    expect(result.current.matchedEntities).toEqual([]);
  });

  it('detects entity name mentions in content', async () => {
    vi.useFakeTimers();
    const aria = makeEntity('Aria');
    const marcus = makeEntity('Marcus');
    const mockService = {
      listEntities: vi.fn().mockResolvedValue([aria, marcus]),
    } as unknown as BibleService;

    const { result } = renderHook(() =>
      useCodexContext({ projectId: 'p1', content: 'Aria walked toward Marcus.', service: mockService }),
    );

    await act(async () => { vi.advanceTimersByTime(800); });

    expect(result.current.matchedEntities).toHaveLength(2);
    vi.useRealTimers();
  });

  it('is case-insensitive', async () => {
    vi.useFakeTimers();
    const aria = makeEntity('Aria');
    const mockService = {
      listEntities: vi.fn().mockResolvedValue([aria]),
    } as unknown as BibleService;

    const { result } = renderHook(() =>
      useCodexContext({ projectId: 'p1', content: 'ARIA entered the room.', service: mockService }),
    );

    await act(async () => { vi.advanceTimersByTime(800); });
    expect(result.current.matchedEntities).toHaveLength(1);
    vi.useRealTimers();
  });

  it('does not match substrings (whole-word only)', async () => {
    vi.useFakeTimers();
    const ark = makeEntity('Ark');
    const mockService = {
      listEntities: vi.fn().mockResolvedValue([ark]),
    } as unknown as BibleService;

    const { result } = renderHook(() =>
      useCodexContext({ projectId: 'p1', content: 'darkness fell', service: mockService }),
    );

    await act(async () => { vi.advanceTimersByTime(800); });
    expect(result.current.matchedEntities).toHaveLength(0);
    vi.useRealTimers();
  });
});
