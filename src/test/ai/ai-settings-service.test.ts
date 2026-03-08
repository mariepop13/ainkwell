import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AiSettingsError, AiSettingsService } from '@/application/ai/ai-settings-service';
import { LocalAiSettingsRepository } from '@/data/ai/local-ai-settings-repository';

function createService(): AiSettingsService {
  const repository = new LocalAiSettingsRepository(window.localStorage);
  return new AiSettingsService(repository);
}

describe('AiSettingsService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null when no key is stored', () => {
    const service = createService();
    expect(service.loadSettings()).toBeNull();
  });

  it('saves and retrieves a trimmed key', () => {
    const service = createService();
    service.saveKey('  sk-test-key  ');
    expect(service.loadSettings()?.openRouterApiKey).toBe('sk-test-key');
  });

  it('throws AiSettingsError when saving an empty string', () => {
    const service = createService();
    expect(() => service.saveKey('')).toThrow(AiSettingsError);
  });

  it('throws AiSettingsError when saving a whitespace-only string', () => {
    const service = createService();
    expect(() => service.saveKey('   ')).toThrow(AiSettingsError);
  });

  it('hasKey returns false after clearKey', () => {
    const service = createService();
    service.saveKey('sk-test-key');
    service.clearKey();
    expect(service.hasKey()).toBe(false);
  });

  it('hasKey returns true after saveKey', () => {
    const service = createService();
    service.saveKey('sk-test-key');
    expect(service.hasKey()).toBe(true);
  });
});

describe('AiSettingsService model selection', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default model when none is saved', () => {
    const service = createService();
    expect(service.getSelectedModel()).toBe('google/gemini-3.1-flash-lite-preview');
  });

  it('returns the saved model after saveModel', () => {
    const service = createService();
    service.saveKey('sk-test-key');
    service.saveModel('anthropic/claude-3-5-sonnet');
    expect(service.getSelectedModel()).toBe('anthropic/claude-3-5-sonnet');
  });

  it('preserves the api key when saving a model', () => {
    const service = createService();
    service.saveKey('sk-my-key');
    service.saveModel('openai/gpt-4o');
    expect(service.hasKey()).toBe(true);
  });
});

describe('AiSettingsService.validateKey', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false for empty string', async () => {
    const service = createService();
    expect(await service.validateKey('')).toBe(false);
  });

  it('returns false for whitespace-only string', async () => {
    const service = createService();
    expect(await service.validateKey('   ')).toBe(false);
  });

  it('returns true when OpenRouter responds with data object', async () => {
    const service = createService();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { label: 'test', usage: 0 } }), { status: 200 }),
    ));
    expect(await service.validateKey('sk-or-valid')).toBe(true);
  });

  it('returns false when OpenRouter responds with error field', async () => {
    const service = createService();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 401, message: 'Invalid key' } }), { status: 200 }),
    ));
    expect(await service.validateKey('sk-or-bad')).toBe(false);
  });

  it('returns false on non-ok response', async () => {
    const service = createService();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 401, statusText: 'Unauthorized' }),
    ));
    expect(await service.validateKey('sk-or-bad')).toBe(false);
  });

  it('returns false when fetch throws', async () => {
    const service = createService();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    expect(await service.validateKey('sk-or-bad')).toBe(false);
  });
});
