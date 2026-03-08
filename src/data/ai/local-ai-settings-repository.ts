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

  public constructor(storage?: Storage) {
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  }

  public load(): AiSettings | null {
    if (!this.storage) return null;
    const raw = this.storage.getItem(AI_SETTINGS_STORAGE_KEY);
    const parsed = parseJson(raw);
    const result = aiSettingsSchema.safeParse(parsed);
    return result.success ? result.data : null;
  }

  public save(settings: AiSettings): void {
    if (!this.storage) return;
    this.storage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  public clear(): void {
    if (!this.storage) return;
    this.storage.removeItem(AI_SETTINGS_STORAGE_KEY);
  }
}
