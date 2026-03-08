import type { LocalAiSettingsRepository } from '@/data/ai/local-ai-settings-repository';
import type { AiSettings } from '@/domain/ai/types';

const OPENROUTER_KEY_VALIDATION_URL = 'https://openrouter.ai/api/v1/key';
const DEFAULT_MODEL = 'google/gemini-3.1-flash-lite-preview';

export class AiSettingsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AiSettingsError';
  }
}

export class AiSettingsService {
  public constructor(private readonly repository: LocalAiSettingsRepository) {}

  public loadSettings(): AiSettings | null {
    return this.repository.load();
  }

  public saveKey(key: string): void {
    const trimmedKey = key.trim();
    if (!trimmedKey) throw new AiSettingsError('API key cannot be empty');
    const current = this.repository.load();
    this.repository.save({ openRouterApiKey: trimmedKey, selectedModel: current?.selectedModel });
  }

  public clearKey(): void {
    const current = this.repository.load();
    if (current?.selectedModel) {
      this.repository.save({ openRouterApiKey: '', selectedModel: current.selectedModel });
    } else {
      this.repository.clear();
    }
  }

  public hasKey(): boolean {
    const settings = this.repository.load();
    return Boolean(settings?.openRouterApiKey);
  }

  public getSelectedModel(): string {
    return this.repository.load()?.selectedModel ?? DEFAULT_MODEL;
  }

  public saveModel(modelId: string): void {
    const current = this.repository.load();
    const apiKey = current?.openRouterApiKey ?? '';
    this.repository.save({ openRouterApiKey: apiKey, selectedModel: modelId });
  }

  public async validateKey(key: string): Promise<boolean> {
    const trimmedKey = key.trim();
    if (!trimmedKey) return false;

    try {
      const response = await fetch(OPENROUTER_KEY_VALIDATION_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${trimmedKey}`,
        },
      });

      if (!response.ok) return false;

      const data: unknown = await response.json();
      if (!data || typeof data !== 'object') return false;

      const record = data as Record<string, unknown>;
      return !record.error && (record.data !== undefined || typeof record.id === 'string');
    } catch {
      return false;
    }
  }
}
