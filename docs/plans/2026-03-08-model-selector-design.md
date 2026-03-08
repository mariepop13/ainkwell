# Model Selector Design

**Date:** 2026-03-08
**Status:** approved

## Goal

Let writers choose their OpenRouter model from a searchable dialog — same UX as mivoa — without leaving the AI Settings panel. The selected model persists in localStorage and is used on every "Generate Draft" call.

## Approach

Option A: model stored in `AiSettings` (localStorage), read at generation time by `SceneDraftService`. No React Context, no global state.

## Data Model

`AiSettings` gains an optional `selectedModel` field:

```ts
export type AiSettings = {
  openRouterApiKey: string;
  selectedModel?: string;
};

export type OpenRouterModel = {
  id: string;
  name: string;
  description: string;
  context_length: number | null;
  pricing: { prompt: string; completion: string };
};
```

Default model: `google/gemini-2.0-flash-001`

## Layers Changed

| File | Change |
|------|--------|
| `src/domain/ai/types.ts` | Add `OpenRouterModel`, add `selectedModel?` to `AiSettings` |
| `src/data/ai/local-ai-settings-repository.ts` | Zod schema: `selectedModel: z.string().optional()` |
| `src/application/ai/model-fetcher.ts` | New — `fetchAvailableModels(apiKey)`, `formatPrice()`, `formatContextLength()`, `extractProvider()` |
| `src/application/ai/ai-settings-service.ts` | Add `saveModel(modelId)`, `getSelectedModel(): string` |
| `src/application/ai/scene-draft-service.ts` | Use `aiSettingsService.getSelectedModel()` instead of hardcoded constant |
| `src/hooks/use-model-loader.ts` | Fetches models when dialog opens, manages loading/error state |
| `src/components/ai/model-card.tsx` | Clickable card: name, provider, price/1K tokens, context length, checkmark if selected |
| `src/components/ai/model-selection-dialog.tsx` | `<dialog>` HTML, search input, scrollable model list |
| `src/components/ai/ai-settings-panel.tsx` | Add "Model: [name]" button that opens dialog |

## User Flow

1. AI Settings panel shows current model name (e.g. "Gemini 2.0 Flash")
2. Click → dialog opens, fetches `/api/v1/models` with stored API key
3. User filters by name, selects model → `aiSettingsService.saveModel(id)` → dialog closes
4. "Generate Draft" → `SceneDraftService.generateDraft()` → `getSelectedModel()` → uses selected model

## Testing

- Unit: `model-fetcher.ts` helpers (formatPrice, formatContextLength, extractProvider)
- Unit: `ai-settings-service` — saveModel, getSelectedModel (default and stored)
- No Playwright needed (model list is an external API; key interaction is covered by existing tests)
