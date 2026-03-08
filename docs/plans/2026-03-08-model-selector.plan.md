# Model Selector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a searchable model selection dialog to the AI Settings panel, letting writers pick any OpenRouter model. The selected model persists in localStorage and is used at generation time.

**Architecture:** Option A — `selectedModel` added to `AiSettings` (localStorage). `SceneDraftService` reads the model from `aiSettingsService.getSelectedModel()` on every `generateDraft()` call. No React Context needed. Models are fetched live from OpenRouter when the dialog opens, using the stored API key.

**Tech Stack:** Next.js App Router (`'use client'`), Vitest, `<dialog>` HTML element, Tailwind CSS, Zod (schema update), fetch API.

---

### Task 1: Add `OpenRouterModel` type and `selectedModel` to `AiSettings`

**Files:**
- Modify: `src/domain/ai/types.ts`

**Step 1: Update the file**

Replace the current content of `src/domain/ai/types.ts`:

```ts
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
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors (the new optional field is backward-compatible).

**Step 3: Commit**

```bash
git add src/domain/ai/types.ts
git commit -m "✨ feat: add OpenRouterModel type and selectedModel to AiSettings"
```

---

### Task 2: Update repository Zod schema for `selectedModel`

**Files:**
- Modify: `src/data/ai/local-ai-settings-repository.ts`

**Step 1: Update the schema**

In `src/data/ai/local-ai-settings-repository.ts`, update `aiSettingsSchema`:

```ts
const aiSettingsSchema = z.object({
  openRouterApiKey: z.string(),
  selectedModel: z.string().optional(),
});
```

No other changes needed — `save()` and `load()` already handle the full `AiSettings` object.

**Step 2: Run existing tests**

```bash
npx vitest run src/test/ai/ai-settings-service.test.ts
```

Expected: all pass (schema change is backward-compatible — `selectedModel` is optional).

**Step 3: Commit**

```bash
git add src/data/ai/local-ai-settings-repository.ts
git commit -m "✨ feat: persist selectedModel in ai settings repository"
```

---

### Task 3: Create `model-fetcher.ts` with fetch + format helpers

**Files:**
- Create: `src/application/ai/model-fetcher.ts`
- Create: `src/test/ai/model-fetcher.test.ts`

**Step 1: Write the failing tests**

Create `src/test/ai/model-fetcher.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatContextLength,
  extractProvider,
} from '@/application/ai/model-fetcher';

describe('formatPrice', () => {
  it('formats non-zero prompt and completion prices per 1K tokens', () => {
    expect(formatPrice('0.000001', '0.000002')).toBe('$0.001 / $0.002 per 1K tokens');
  });

  it('shows $0 for zero prices', () => {
    expect(formatPrice('0', '0')).toBe('$0 / $0 per 1K tokens');
  });

  it('returns N/A for invalid prices', () => {
    expect(formatPrice('', '')).toBe('N/A');
  });
});

describe('formatContextLength', () => {
  it('formats millions', () => {
    expect(formatContextLength(1_000_000)).toBe('1.0M tokens');
  });

  it('formats thousands', () => {
    expect(formatContextLength(128_000)).toBe('128K tokens');
  });

  it('formats small values', () => {
    expect(formatContextLength(512)).toBe('512 tokens');
  });

  it('returns N/A for null', () => {
    expect(formatContextLength(null)).toBe('N/A');
  });
});

describe('extractProvider', () => {
  it('capitalizes the provider from a model id', () => {
    expect(extractProvider('google/gemini-2.0-flash-001')).toBe('Google');
  });

  it('handles anthropic', () => {
    expect(extractProvider('anthropic/claude-3-5-sonnet')).toBe('Anthropic');
  });

  it('returns empty string for malformed id', () => {
    expect(extractProvider('')).toBe('');
  });
});
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/test/ai/model-fetcher.test.ts
```

Expected: FAIL — "Cannot find module '@/application/ai/model-fetcher'"

**Step 3: Implement `model-fetcher.ts`**

Create `src/application/ai/model-fetcher.ts`:

```ts
import type { OpenRouterModel } from '@/domain/ai/types';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const PRICE_PER_K = 1000;
const PRICE_DECIMAL_PLACES = 3;

export async function fetchAvailableModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch models: ${response.status}`);
  const data = (await response.json()) as { data: OpenRouterModel[] };
  return data.data ?? [];
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
```

**Step 4: Run tests**

```bash
npx vitest run src/test/ai/model-fetcher.test.ts
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/application/ai/model-fetcher.ts src/test/ai/model-fetcher.test.ts
git commit -m "✨ feat: add model-fetcher with fetch and format helpers"
```

---

### Task 4: Add `saveModel` and `getSelectedModel` to `AiSettingsService`

**Files:**
- Modify: `src/application/ai/ai-settings-service.ts`
- Modify: `src/test/ai/ai-settings-service.test.ts`

**Step 1: Write the failing tests**

Add to `src/test/ai/ai-settings-service.test.ts` inside the `AiSettingsService` describe block:

```ts
describe('AiSettingsService model selection', () => {
  it('returns default model when none is saved', () => {
    const repo = new LocalAiSettingsRepository(new InMemoryStorage());
    const service = new AiSettingsService(repo);
    expect(service.getSelectedModel()).toBe('google/gemini-2.0-flash-001');
  });

  it('returns the saved model after saveModel', () => {
    const repo = new LocalAiSettingsRepository(new InMemoryStorage());
    const service = new AiSettingsService(repo);
    // need a key first so repo has settings to merge into
    service.saveKey('sk-test-key');
    service.saveModel('anthropic/claude-3-5-sonnet');
    expect(service.getSelectedModel()).toBe('anthropic/claude-3-5-sonnet');
  });

  it('preserves the api key when saving a model', () => {
    const repo = new LocalAiSettingsRepository(new InMemoryStorage());
    const service = new AiSettingsService(repo);
    service.saveKey('sk-my-key');
    service.saveModel('openai/gpt-4o');
    expect(service.hasKey()).toBe(true);
  });
});
```

**Step 2: Run to verify failure**

```bash
npx vitest run src/test/ai/ai-settings-service.test.ts
```

Expected: FAIL — "service.getSelectedModel is not a function"

**Step 3: Implement the new methods**

In `src/application/ai/ai-settings-service.ts`, add after `hasKey()`:

```ts
const DEFAULT_MODEL = 'google/gemini-2.0-flash-001';

public getSelectedModel(): string {
  return this.repository.load()?.selectedModel ?? DEFAULT_MODEL;
}

public saveModel(modelId: string): void {
  const current = this.repository.load();
  const apiKey = current?.openRouterApiKey ?? '';
  this.repository.save({ openRouterApiKey: apiKey, selectedModel: modelId });
}
```

Place `DEFAULT_MODEL` as a module-level constant at the top of the file, after the imports.

**Step 4: Run tests**

```bash
npx vitest run src/test/ai/ai-settings-service.test.ts
```

Expected: all pass.

**Step 5: Commit**

```bash
git add src/application/ai/ai-settings-service.ts src/test/ai/ai-settings-service.test.ts
git commit -m "✨ feat: add saveModel and getSelectedModel to AiSettingsService"
```

---

### Task 5: Use `getSelectedModel()` in `SceneDraftService`

**Files:**
- Modify: `src/application/ai/scene-draft-service.ts`

**Step 1: Remove the hardcoded constant and use the service**

In `src/application/ai/scene-draft-service.ts`:
- Delete the line `const OPENROUTER_DEFAULT_MODEL = 'google/gemini-2.0-flash-001';`
- In `generateDraft()`, replace `model: OPENROUTER_DEFAULT_MODEL` with `model: this.aiSettingsService.getSelectedModel()`

**Step 2: Run existing draft service tests**

```bash
npx vitest run src/test/ai/scene-draft-service.test.ts
```

Expected: all pass. The tests mock `hasKey()` and `loadSettings()` — `getSelectedModel()` needs to be stubbed too. If any test fails because `getSelectedModel` is not mocked, add it to the mock:

```ts
getSelectedModel: vi.fn().mockReturnValue('google/gemini-2.0-flash-001'),
```

Add this to the `mockAiSettingsService` object in the test file.

**Step 3: Run full CI**

```bash
npm run test:ci
```

Expected: all pass.

**Step 4: Commit**

```bash
git add src/application/ai/scene-draft-service.ts src/test/ai/scene-draft-service.test.ts
git commit -m "♻️ refactor: use getSelectedModel() instead of hardcoded model constant"
```

---

### Task 6: Create `useModelLoader` hook

**Files:**
- Create: `src/hooks/use-model-loader.ts`

No unit test needed — this hook is an async state wrapper around `fetchAvailableModels`. It will be covered by Playwright testing.

**Step 1: Create the hook**

Create `src/hooks/use-model-loader.ts`:

```ts
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
```

**Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/hooks/use-model-loader.ts
git commit -m "✨ feat: add useModelLoader hook"
```

---

### Task 7: Create `ModelCard` component

**Files:**
- Create: `src/components/ai/model-card.tsx`

**Step 1: Create the component**

Create `src/components/ai/model-card.tsx`:

```tsx
import type { ReactElement } from 'react';

import { extractProvider, formatContextLength, formatPrice } from '@/application/ai/model-fetcher';
import type { OpenRouterModel } from '@/domain/ai/types';

type ModelCardProps = {
  model: OpenRouterModel;
  isSelected: boolean;
  onSelect: (modelId: string) => void;
};

export function ModelCard({ model, isSelected, onSelect }: ModelCardProps): ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(model.id)}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-muted'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium truncate">{model.name}</span>
            {isSelected ? <span className="text-primary text-xs flex-shrink-0">✓</span> : null}
          </div>
          <p className="text-xs text-muted-foreground mb-1">{extractProvider(model.id)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span>💰 {formatPrice(model.pricing.prompt, model.pricing.completion)}</span>
            <span>📏 {formatContextLength(model.context_length)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
```

**Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/ai/model-card.tsx
git commit -m "✨ feat: add ModelCard component with price and context length"
```

---

### Task 8: Create `ModelSelectionDialog` component

**Files:**
- Create: `src/components/ai/model-selection-dialog.tsx`

**Step 1: Create the component**

Create `src/components/ai/model-selection-dialog.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import type { AiSettingsService } from '@/application/ai/ai-settings-service';
import { ModelCard } from '@/components/ai/model-card';
import { useModelLoader } from '@/hooks/use-model-loader';

type ModelSelectionDialogProps = {
  service: AiSettingsService;
  selectedModel: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
};

export function ModelSelectionDialog({
  service,
  selectedModel,
  onSelect,
  onClose,
}: ModelSelectionDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState('');
  const { models, isLoading, error, load } = useModelLoader(service);

  useEffect(() => {
    dialogRef.current?.showModal();
    void load();
  }, [load]);

  const filtered = models.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSelect(modelId: string): void {
    onSelect(modelId);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-xl rounded-xl border bg-card p-0 shadow-lg backdrop:bg-black/50"
    >
      <div className="flex flex-col max-h-[80vh]">
        <div className="p-4 border-b space-y-3">
          <h2 className="text-lg font-headline font-semibold">Select model</h2>
          <input
            type="search"
            placeholder="Search models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border bg-background px-3 py-1.5 text-sm"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading models…</p>
          ) : null}
          {error ? (
            <p className="text-sm text-destructive text-center py-8">{error}</p>
          ) : null}
          {!isLoading && !error && filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No models found.</p>
          ) : null}
          {!isLoading && !error
            ? filtered.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={model.id === selectedModel}
                  onSelect={handleSelect}
                />
              ))
            : null}
        </div>

        <div className="p-4 border-t flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
```

**Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/components/ai/model-selection-dialog.tsx
git commit -m "✨ feat: add ModelSelectionDialog with search and model list"
```

---

### Task 9: Wire up model selector in `AiSettingsPanel`

**Files:**
- Modify: `src/components/ai/ai-settings-panel.tsx`

**Step 1: Add model selector state and dialog**

In `src/components/ai/ai-settings-panel.tsx`:

1. Add import:
```ts
import { ModelSelectionDialog } from '@/components/ai/model-selection-dialog';
```

2. Add state inside `AiSettingsPanel`:
```ts
const [showModelDialog, setShowModelDialog] = useState(false);
const [selectedModel, setSelectedModel] = useState(() => service.getSelectedModel());
```

3. Add handler:
```ts
function handleModelSelect(modelId: string): void {
  service.saveModel(modelId);
  setSelectedModel(modelId);
}
```

4. Add the model button + dialog **after** the key section and before the disclaimer `<p>`, inside the JSX:
```tsx
<div className="flex items-center gap-2">
  <span className="text-xs text-muted-foreground">Model:</span>
  <button
    type="button"
    onClick={() => setShowModelDialog(true)}
    disabled={!hasKey}
    title={hasKey ? 'Change model' : 'Set an API key first'}
    className="text-xs underline hover:no-underline disabled:cursor-not-allowed disabled:opacity-40"
  >
    {selectedModel.split('/').pop() ?? selectedModel}
  </button>
</div>

{showModelDialog ? (
  <ModelSelectionDialog
    service={service}
    selectedModel={selectedModel}
    onSelect={handleModelSelect}
    onClose={() => setShowModelDialog(false)}
  />
) : null}
```

**Step 2: Run full CI**

```bash
npm run test:ci
```

Expected: all pass.

**Step 3: Commit**

```bash
git add src/components/ai/ai-settings-panel.tsx
git commit -m "✨ feat: add model selector button and dialog to AiSettingsPanel"
```

---

### Task 10: Final verification

**Step 1: Run full CI**

```bash
npm run test:ci
```

Expected: all 146+ tests pass, no lint or type errors.

**Step 2: Manual smoke test**
- Go to `/workspace`, confirm "Model: gemini-2.0-flash-001" appears in AI Settings (only if key is set)
- Click it → dialog opens, models load, search works, selection saves
- Generate Draft in scene editor → uses the newly selected model
