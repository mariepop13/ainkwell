import { useCallback, useState } from 'react';

import type { SceneDraftService } from '@/application/ai/scene-draft-service';
import type { BibleEntity } from '@/domain/bible/types';
import type { SceneBeat } from '@/domain/scene/schemas';
import type { Scene } from '@/domain/scene/types';

type UseSceneDraftInput = {
  scene: Scene | null;
  synopsis: string;
  beats: SceneBeat[];
  entities: BibleEntity[];
  language: string;
  service: SceneDraftService;
  onDraftReady: (draft: string) => void;
};

export type UseSceneDraftResult = {
  isGenerating: boolean;
  generateError: string | null;
  canGenerate: boolean;
  generate: () => Promise<void>;
  clearError: () => void;
};

export function useSceneDraft({
  scene,
  synopsis,
  beats,
  entities,
  language,
  service,
  onDraftReady,
}: UseSceneDraftInput): UseSceneDraftResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const canGenerate = Boolean(synopsis.trim());

  const generate = useCallback(async (): Promise<void> => {
    if (!canGenerate || !scene) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      const result = await service.generateDraft({
        sceneTitle: scene.title,
        synopsis,
        beats,
        entities,
        language,
      });

      if (result.state === 'success') {
        onDraftReady(result.draft);
      } else if (result.state === 'no-api-key') {
        setGenerateError('Set your OpenRouter API key in project settings.');
      } else {
        setGenerateError(result.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, scene, synopsis, beats, entities, language, service, onDraftReady]);

  const clearError = useCallback(() => setGenerateError(null), []);

  return { isGenerating, generateError, canGenerate, generate, clearError };
}
