import type { AiSettingsService } from '@/application/ai/ai-settings-service';
import type { SceneDraftRequest, SceneDraftResult } from '@/domain/ai/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function buildSystemPrompt(request: SceneDraftRequest): string {
  const entityLines = request.entities
    .map((entity) => `- ${entity.name} (${entity.category}): ${entity.summary.slice(0, 200)}`)
    .join('\n');

  const contextBlock = entityLines
    ? `\nStory context:\n${entityLines}`
    : '';

  return [
    'You are a creative writing assistant. Write immersive, literary prose.',
    `Language: ${request.language}.`,
    'Do not include chapter headings or scene titles.',
    'Return only the scene prose.',
    contextBlock,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildUserPrompt(request: SceneDraftRequest): string {
  const beatLines = request.beats
    .map((beat) => `- [${beat.type}] ${beat.content}`)
    .join('\n');

  return [
    'Write a scene draft based on this outline:',
    '',
    `Title: ${request.sceneTitle}`,
    `Synopsis: ${request.synopsis}`,
    `Beats:\n${beatLines}`,
    '',
    `Write the full scene in ${request.language}.`,
  ].join('\n');
}

function stripCodeFences(text: string): string {
  return text.replace(/^```[\w]*\n?/m, '').replace(/\n?```$/m, '').trim();
}

function extractDraft(body: unknown): string | null {
  if (
    typeof body === 'object' &&
    body !== null &&
    'choices' in body &&
    Array.isArray((body as Record<string, unknown>).choices)
  ) {
    const choices = (body as { choices: unknown[] }).choices;
    const first = choices[0];
    if (
      typeof first === 'object' &&
      first !== null &&
      'message' in first &&
      typeof (first as { message: unknown }).message === 'object'
    ) {
      const message = (first as { message: Record<string, unknown> }).message;
      if (typeof message.content === 'string') {
        return message.content;
      }
    }
  }
  return null;
}

export class SceneDraftService {
  public constructor(private readonly aiSettingsService: AiSettingsService) {}

  public async generateDraft(request: SceneDraftRequest): Promise<SceneDraftResult> {
    if (!this.aiSettingsService.hasKey()) {
      return { state: 'no-api-key' };
    }

    const settings = this.aiSettingsService.loadSettings();
    const apiKey = settings?.openRouterApiKey ?? '';

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://ainkwell.app',
        },
        body: JSON.stringify({
          model: this.aiSettingsService.getSelectedModel(),
          messages: [
            { role: 'system', content: buildSystemPrompt(request) },
            { role: 'user', content: buildUserPrompt(request) },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        return { state: 'api-error', message: `${response.status}: ${response.statusText}` };
      }

      const body: unknown = await response.json();
      const raw = extractDraft(body);

      if (!raw) {
        return { state: 'api-error', message: 'Unexpected response format from API.' };
      }

      return { state: 'success', draft: stripCodeFences(raw) };
    } catch {
      return { state: 'api-error', message: 'Network error. Check your connection.' };
    }
  }
}
