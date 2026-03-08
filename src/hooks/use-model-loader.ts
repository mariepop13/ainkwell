import { useState, useCallback } from 'react';

import type { AiSettingsService } from '@/application/ai/ai-settings-service';
import { fetchAvailableModels } from '@/application/ai/model-fetcher';
import type { OpenRouterModel } from '@/domain/ai/types';

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

    setIsLoading(true);
    setError(null);

    try {
      const fetched = await fetchAvailableModels(settings.openRouterApiKey);
      setModels(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models.');
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  return { models, isLoading, error, load };
}
