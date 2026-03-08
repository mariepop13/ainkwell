import { z } from 'zod';

import type { AiSettings } from '@/domain/ai/types';

const AI_SETTINGS_STORAGE_KEY = 'ainkwell:ai:settings:v1';

const aiSettingsSchema = z.object({
  openRouterApiKey: z.string(),
  selectedModel: z.string().optional(),
});

function parseJson(rawValue: string | null): unknown {
  if (!rawValue) return null;
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

export class LocalAiSettingsRepository {
  private readonly storage: Storage | null;
  private _cache: AiSettings | null | undefined = undefined;

  public constructor(storage?: Storage) {
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  }

  public load(): AiSettings | null {
    if (this._cache !== undefined) return this._cache;
    if (!this.storage) { this._cache = null; return null; }
    const raw = this.storage.getItem(AI_SETTINGS_STORAGE_KEY);
    const parsed = parseJson(raw);
    const result = aiSettingsSchema.safeParse(parsed);
    this._cache = result.success ? result.data : null;
    return this._cache;
  }

  public save(settings: AiSettings): void {
    if (!this.storage) return;
    this.storage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    this._cache = settings;
  }

  public clear(): void {
    if (!this.storage) return;
    this.storage.removeItem(AI_SETTINGS_STORAGE_KEY);
    this._cache = null;
  }
}
