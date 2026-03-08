import { AiSettingsService } from '@/application/ai/ai-settings-service';
import { SceneDraftService } from '@/application/ai/scene-draft-service';
import { LocalAiSettingsRepository } from '@/data/ai/local-ai-settings-repository';

export function createSceneDraftService(): SceneDraftService {
  return new SceneDraftService(new AiSettingsService(new LocalAiSettingsRepository()));
}
