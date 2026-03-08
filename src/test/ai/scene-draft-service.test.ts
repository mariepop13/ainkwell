import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AiSettingsService } from '@/application/ai/ai-settings-service';
import { SceneDraftService } from '@/application/ai/scene-draft-service';
import { LocalAiSettingsRepository } from '@/data/ai/local-ai-settings-repository';
import type { BibleEntity } from '@/domain/bible/types';
import type { SceneBeat } from '@/domain/scene/schemas';
import type { SceneDraftRequest } from '@/domain/ai/types';

function createService(): { service: SceneDraftService; aiService: AiSettingsService } {
  const repository = new LocalAiSettingsRepository(window.localStorage);
  const aiService = new AiSettingsService(repository);
  const service = new SceneDraftService(aiService);
  return { service, aiService };
}

function buildEntity(overrides: Partial<BibleEntity> = {}): BibleEntity {
  return {
    id: 'entity-1',
    projectId: 'project-1',
    category: 'character',
    name: 'Aria',
    summary: 'A skilled warrior',
    details: '',
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildBeat(overrides: Partial<SceneBeat> = {}): SceneBeat {
  return {
    id: 'beat-1',
    type: 'action',
    content: 'The hero draws their sword',
    ...overrides,
  };
}

function buildRequest(overrides: Partial<SceneDraftRequest> = {}): SceneDraftRequest {
  return {
    sceneTitle: 'The Final Battle',
    synopsis: 'The hero faces the villain in a climactic fight.',
    beats: [buildBeat()],
    entities: [buildEntity()],
    language: 'en',
    ...overrides,
  };
}

function makeOkResponse(content: string): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    { status: 200 },
  );
}

function makeErrorResponse(status: number, statusText: string): Response {
  return new Response(null, { status, statusText });
}

describe('SceneDraftService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns no-api-key state when no key is configured', async () => {
    const { service } = createService();
    const result = await service.generateDraft(buildRequest());
    expect(result).toEqual({ state: 'no-api-key' });
  });

  it('returns success with draft content on 200 response', async () => {
    const { service, aiService } = createService();
    aiService.saveKey('sk-valid-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeOkResponse('Once upon a time...')));

    const result = await service.generateDraft(buildRequest());
    expect(result).toEqual({ state: 'success', draft: 'Once upon a time...' });
  });

  it('returns api-error on 401 response with message', async () => {
    const { service, aiService } = createService();
    aiService.saveKey('sk-invalid-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeErrorResponse(401, 'Unauthorized')));

    const result = await service.generateDraft(buildRequest());
    expect(result).toEqual({ state: 'api-error', message: '401: Unauthorized' });
  });

  it('returns api-error on 429 response with message', async () => {
    const { service, aiService } = createService();
    aiService.saveKey('sk-valid-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeErrorResponse(429, 'Too Many Requests')));

    const result = await service.generateDraft(buildRequest());
    expect(result).toEqual({ state: 'api-error', message: '429: Too Many Requests' });
  });

  it('returns api-error when fetch throws a network error', async () => {
    const { service, aiService } = createService();
    aiService.saveKey('sk-valid-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    const result = await service.generateDraft(buildRequest());
    expect(result).toEqual({ state: 'api-error', message: 'Network error. Check your connection.' });
  });

  it('includes entity names and categories in the request body', async () => {
    const { service, aiService } = createService();
    aiService.saveKey('sk-valid-key');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse('prose'));
    vi.stubGlobal('fetch', mockFetch);

    await service.generateDraft(buildRequest({ entities: [buildEntity({ name: 'Aria', category: 'character' })] }));

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
    const systemMessage = body.messages.find((m) => m.role === 'system')?.content ?? '';
    expect(systemMessage).toContain('Aria');
    expect(systemMessage).toContain('character');
  });

  it('includes beat content in the request body', async () => {
    const { service, aiService } = createService();
    aiService.saveKey('sk-valid-key');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse('prose'));
    vi.stubGlobal('fetch', mockFetch);

    await service.generateDraft(buildRequest({ beats: [buildBeat({ content: 'The hero draws their sword' })] }));

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
    const userMessage = body.messages.find((m) => m.role === 'user')?.content ?? '';
    expect(userMessage).toContain('The hero draws their sword');
  });

  it('includes language in the request body', async () => {
    const { service, aiService } = createService();
    aiService.saveKey('sk-valid-key');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse('prose'));
    vi.stubGlobal('fetch', mockFetch);

    await service.generateDraft(buildRequest({ language: 'fr' }));

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
    const systemMessage = body.messages.find((m) => m.role === 'system')?.content ?? '';
    expect(systemMessage).toContain('fr');
  });

  it('strips code fences from the returned draft', async () => {
    const { service, aiService } = createService();
    aiService.saveKey('sk-valid-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeOkResponse('```markdown\nOnce upon a time...\n```')));

    const result = await service.generateDraft(buildRequest());
    expect(result).toEqual({ state: 'success', draft: 'Once upon a time...' });
  });
});
