import { useState, useCallback } from 'react';

import type { AiSettingsService } from '@/application/ai/ai-settings-service';
import { fetchAvailableModels } from '@/application/ai/model-fetcher';
import type { OpenRouterModel } from '@/domain/ai/types';

function cacheKey(apiKey: string): string {
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    hash = ((hash << 5) - hash + apiKey.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

const modelCache = new Map<string, OpenRouterModel[]>();

export type UseModelLoaderResult = {
  models: OpenRouterModel[];
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
};

export function useModelLoader(service: AiSettingsService): UseModelLoaderResult {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const settings = service.loadSettings();
    if (!settings?.openRouterApiKey) return;

    const key = cacheKey(settings.openRouterApiKey);
    const cached = modelCache.get(key);
    if (cached) {
      setModels(cached);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetched = await fetchAvailableModels(settings.openRouterApiKey);
      modelCache.set(key, fetched);
      setModels(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models.');
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  return { models, isLoading, error, load };
}
