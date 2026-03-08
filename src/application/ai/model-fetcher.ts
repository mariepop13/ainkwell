import { z } from 'zod';

import type { OpenRouterModel } from '@/domain/ai/types';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const PRICE_PER_K = 1000;
const PRICE_DECIMAL_PLACES = 3;

const openRouterModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  context_length: z.number().nullable(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
});

const openRouterResponseSchema = z.object({
  data: z.array(openRouterModelSchema),
});

export async function fetchAvailableModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
  const parsed = openRouterResponseSchema.parse(await response.json());
  return parsed.data;
}

export function formatPrice(prompt: string, completion: string): string {
  const p = parseFloat(prompt);
  const c = parseFloat(completion);
  if (isNaN(p) || isNaN(c)) return 'N/A';
  const fmt = (v: number): string =>
    v === 0 ? '$0' : `$${(v * PRICE_PER_K).toFixed(PRICE_DECIMAL_PLACES)}`;
  return `${fmt(p)} / ${fmt(c)} per 1K tokens`;
}

export function formatContextLength(contextLength: number | null): string {
  if (!contextLength) return 'N/A';
  if (contextLength >= 1_000_000) return `${(contextLength / 1_000_000).toFixed(1)}M tokens`;
  if (contextLength >= 1_000) return `${Math.round(contextLength / 1_000)}K tokens`;
  return `${contextLength} tokens`;
}

export function extractProvider(modelId: string): string {
  const provider = modelId.split('/')[0] ?? '';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
