import type { BibleEntity } from '@/domain/bible/types';
import type { SceneBeat } from '@/domain/scene/schemas';

export type OpenRouterModel = {
  id: string;
  name: string;
  description: string;
  context_length: number | null;
  pricing: {
    prompt: string;
    completion: string;
  };
};

export type AiSettings = {
  openRouterApiKey: string;
  selectedModel?: string;
};

export type SceneDraftRequest = {
  sceneTitle: string;
  synopsis: string;
  beats: SceneBeat[];
  entities: BibleEntity[];
  language: string;
};

export type SceneDraftResult =
  | { state: 'success'; draft: string }
  | { state: 'no-api-key' }
  | { state: 'api-error'; message: string };
