---
name: ai-scene-draft
overview: |
  From the scene editor, a writer can click "Generate Draft" to send the scene synopsis, beats, and
  relevant Codex entities (via the existing codex context system) to OpenRouter's AI API, which returns
  a prose draft that pre-fills the scene content editor. The writer provides their own OpenRouter API key
  stored in localStorage. The feature is entirely local-first: no key or content ever touches a server.
todos:
  - id: 1
    content: "Add AiSettings domain type and localStorage key; build LocalAiSettingsRepository to persist the OpenRouter API key"
    status: pending
    dependencies: []
  - id: 2
    content: "Build AiSettingsService in application layer (saveKey, loadKey, clearKey, hasKey)"
    status: pending
    dependencies: [1]
  - id: 3
    content: "Add domain types for SceneDraftRequest and SceneDraftResult"
    status: pending
    dependencies: []
  - id: 4
    content: "Build SceneDraftService: assemble prompt from scene + entities, call OpenRouter via fetch, return draft string"
    status: pending
    dependencies: [2, 3]
  - id: 5
    content: "Write Vitest unit tests for SceneDraftService (mock fetch, assert prompt shape, assert error handling)"
    status: pending
    dependencies: [4]
  - id: 6
    content: "Build AiSettingsPanel component for API key entry (input + save + clear)"
    status: pending
    dependencies: [2]
  - id: 7
    content: "Add AI Settings section to the workspace project page"
    status: pending
    dependencies: [6]
  - id: 8
    content: "Build useSceneDraft hook: calls SceneDraftService, exposes isGenerating / generateError / generate()"
    status: pending
    dependencies: [4]
  - id: 9
    content: "Add GenerateDraftButton component to scene editor"
    status: pending
    dependencies: [8]
  - id: 10
    content: "Wire GenerateDraftButton into SceneEditorShell with matchedEntities from useCodexContext"
    status: pending
    dependencies: [9]
  - id: 11
    content: "Run npm run test:ci and fix any regressions"
    status: pending
    dependencies: [10]
---

## Overview

When a writer has filled in a synopsis and beats for a scene, they can click "Generate Draft" in the
scene editor. The app assembles a structured prompt from the scene title, synopsis, beat list, and any
Codex entities currently detected by `useCodexContext`, then calls the OpenRouter API
(`https://openrouter.ai/api/v1/chat/completions`) directly from the browser. The returned prose
pre-fills the content textarea, and the existing autosave debounce persists it after 800ms of inactivity.

The writer supplies their own OpenRouter API key once, via a new "AI Settings" panel on the project
page. The key is stored only in `localStorage` under `ainkwell:ai:settings:v1`. It is never sent to
any Ainkwell server, never exported with the project JSON, and rendered as a password input in the UI.

---

## Architecture / Data Model

### New localStorage key

| Key | Contents |
|-----|----------|
| `ainkwell:ai:settings:v1` | `{ openRouterApiKey: string }` — global, not per-project |

This key is intentionally not namespaced per project because it is a user-level credential.

### New domain layer — `src/domain/ai/types.ts`

```ts
export type AiSettings = {
  openRouterApiKey: string;
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

No Zod schemas for `SceneDraftRequest` or `SceneDraftResult` — transient in-memory types, never
persisted. A minimal Zod schema for `AiSettings` lives in the data layer for safe deserialization.

### New application services — `src/application/ai/`

**`AiSettingsService`**: thin wrapper over `LocalAiSettingsRepository`.
- `loadSettings(): AiSettings | null`
- `saveKey(key: string): void` — trims, rejects empty, throws `AiSettingsError`
- `clearKey(): void`
- `hasKey(): boolean`

**`SceneDraftService`**: orchestrates the OpenRouter call.
- `generateDraft(request: SceneDraftRequest): Promise<SceneDraftResult>`
- Builds system + user prompts
- Calls `https://openrouter.ai/api/v1/chat/completions` via native `fetch`
- Default model constant: `OPENROUTER_DEFAULT_MODEL = 'google/gemini-flash-1.5'`
- Handles HTTP 4xx/5xx, JSON parse errors, missing response body

### New data repository — `src/data/ai/local-ai-settings-repository.ts`

Mirrors `LocalBibleRepository` SSR guard pattern:

```ts
export class LocalAiSettingsRepository {
  private readonly storage: Storage | null;

  public constructor(storage?: Storage) {
    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  }
}
```

---

## Implementation Steps

### Task 1 — Domain types and repository

**Create:** `src/domain/ai/types.ts`, `src/data/ai/local-ai-settings-repository.ts`

```ts
const AI_SETTINGS_STORAGE_KEY = 'ainkwell:ai:settings:v1';

const aiSettingsSchema = z.object({
  openRouterApiKey: z.string(),
});
```

Implement `load()`, `save(settings)`, `clear()` with `JSON.parse`/`JSON.stringify` guarded by `try/catch`.

### Task 2 — AiSettingsService

**Create:** `src/application/ai/ai-settings-service.ts`

```ts
export class AiSettingsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'AiSettingsError';
  }
}

export class AiSettingsService {
  public constructor(private readonly repository: LocalAiSettingsRepository) {}

  public saveKey(key: string): void {
    const trimmedKey = key.trim();
    if (!trimmedKey) throw new AiSettingsError('API key cannot be empty');
    this.repository.save({ openRouterApiKey: trimmedKey });
  }
  // ...
}
```

### Task 3 — SceneDraftService

**Create:** `src/application/ai/scene-draft-service.ts`

**System prompt:**
```
You are a creative writing assistant. Write immersive, literary prose.
Language: {language}.
Do not include chapter headings or scene titles.
Return only the scene prose.

Story context:
{entities.map(e => `- ${e.name} (${e.category}): ${e.summary.slice(0, 200)}`).join('\n')}
```

**User prompt:**
```
Write a scene draft based on this outline:

Title: {sceneTitle}
Synopsis: {synopsis}
Beats:
{beats.map(b => `- [${b.type}] ${b.content}`).join('\n')}

Write the full scene in {language}.
```

**Fetch call:**
```ts
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://ainkwell.app',
  },
  body: JSON.stringify({
    model: OPENROUTER_DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
  }),
});
```

Return `{ state: 'no-api-key' }` immediately when `hasKey()` is false. On non-2xx:
`{ state: 'api-error', message: \`${status}: ${statusText}\` }`. On fetch throw:
`{ state: 'api-error', message: 'Network error. Check your connection.' }`.

### Task 4 — Tests

**Create:**
- `src/test/ai/ai-settings-service.test.ts` — uses real `LocalAiSettingsRepository` backed by `window.localStorage`
- `src/test/ai/scene-draft-service.test.ts` — mocks fetch with `vi.stubGlobal`

### Task 5 — AiSettingsPanel component

**Create:** `src/components/ai/ai-settings-panel.tsx`

Collapsible section (same pattern as `ExportImportPanel`). Renders:
- Status: "API key configured" or "No API key set"
- `<input type="password">` for key entry
- "Save Key" / "Clear Key" buttons
- Disclaimer: "Your key is stored only in this browser. It is never sent to any Ainkwell server."
- Link to `https://openrouter.ai/keys`

**Modify:** `src/app/workspace/[projectId]/page.tsx` — add `AiSettingsSection` after `ProjectWritingGoalsSection`.

### Task 6 — useSceneDraft hook

**Create:** `src/hooks/use-scene-draft.ts`

```ts
type UseSceneDraftResult = {
  isGenerating: boolean;
  generateError: string | null;
  canGenerate: boolean;   // Boolean(scene?.synopsis?.trim())
  generate: () => Promise<void>;
  clearError: () => void;
};
```

`generate()` guards on `canGenerate`, sets `isGenerating`, calls service, handles all three
`SceneDraftResult` states, calls `onDraftReady` on success, always clears `isGenerating` in `finally`.

### Task 7 — GenerateDraftButton component

**Create:** `src/components/scene/generate-draft-button.tsx`

```ts
type GenerateDraftButtonProps = {
  isGenerating: boolean;
  generateError: string | null;
  canGenerate: boolean;
  onGenerate: () => void;
  onClearError: () => void;
};
```

Reuses `SceneSaveError` styling from `scene-toolbar.tsx` for the inline error alert.

### Task 8 — Wire into SceneEditorShell

**Modify:** `src/components/scene/scene-editor-shell.tsx`

In `useShellServices`, add:
```ts
const draftService = useMemo(
  () => new SceneDraftService(new AiSettingsService(new LocalAiSettingsRepository())),
  [],
);
```

Pass `draftService` to `SceneEditorLoadedView`. Inside it:
```ts
const { isGenerating, generateError, canGenerate, generate, clearError } = useSceneDraft({
  scene: props.sceneEditor.scene,
  entities: matchedEntities,
  language: props.language ?? 'en',
  service: props.draftService,
  onDraftReady: props.sceneEditor.setContent,
});
```

Place `<GenerateDraftButton>` above the content textarea, right-aligned.

---

## Files

### Create
- `src/domain/ai/types.ts`
- `src/data/ai/local-ai-settings-repository.ts`
- `src/application/ai/ai-settings-service.ts`
- `src/application/ai/scene-draft-service.ts`
- `src/components/ai/ai-settings-panel.tsx`
- `src/components/scene/generate-draft-button.tsx`
- `src/hooks/use-scene-draft.ts`
- `src/test/ai/ai-settings-service.test.ts`
- `src/test/ai/scene-draft-service.test.ts`

### Modify
- `src/app/workspace/[projectId]/page.tsx` — add `AiSettingsSection`
- `src/components/scene/scene-editor-shell.tsx` — add `draftService`, `useSceneDraft`, `GenerateDraftButton`, `language` prop

---

## Security

**API key in localStorage:** Rendered as `type="password"`, never re-displayed after saving, not
included in `ProjectExport` schema. Clear disclaimer in UI.

**Direct browser-to-OpenRouter:** No Ainkwell server sees the key or prompt. `HTTP-Referer` header
identifies the app per OpenRouter guidelines, contains no user data.

**Prompt injection:** Synopsis capped at 300 chars, each beat at 200 chars by existing Zod schemas.
Entity summaries truncated to 200 chars before embedding. Output only affects local scene content.

**HTTPS only:** Fetch target hardcoded to `https://openrouter.ai`.

---

## Testing

```
src/test/ai/ai-settings-service.test.ts
  - returns null when no key is stored
  - saves and retrieves a trimmed key
  - throws AiSettingsError when saving an empty string
  - throws AiSettingsError when saving whitespace-only string
  - hasKey returns false after clearKey
  - hasKey returns true after saveKey

src/test/ai/scene-draft-service.test.ts
  - returns no-api-key state when no key is configured
  - returns success with draft content on 200 response
  - returns api-error on 401 response with message
  - returns api-error on 429 response with message
  - returns api-error when fetch throws a network error
  - includes entity names and categories in the request body
  - includes beat content in the request body
  - includes language in the request body
  - strips code fences from the returned draft
```

---

## User Flows

**Flow A — First-time API key setup:**
1. User opens `/workspace/{projectId}`
2. User finds the "AI Settings" section (below Writing Goals)
3. User pastes OpenRouter API key → clicks "Save Key" → shows "Saved" for 2s
4. Key written to `ainkwell:ai:settings:v1`

**Flow B — Generating a draft:**
1. User opens scene with synopsis + beats filled in
2. "Generate Draft" button appears above content textarea
3. User clicks → button shows "Generating..." (disabled)
4. Fetch to OpenRouter → on success: textarea fills with draft, autosave fires after 800ms
5. User edits freely

**Flow C — No API key:**
- Inline error: "Set your OpenRouter API key in project settings."

**Flow D — No synopsis:**
- Button disabled; tooltip: "Add a synopsis to enable AI draft generation"

**Flow E — API error:**
- Inline error with status message (e.g., "401: Unauthorized")

---

## Dependencies

No new npm packages required. Native browser `fetch` API, fully available in modern browsers and
`happy-dom` test environment. OpenRouter uses the OpenAI request/response format — no SDK needed.

Default model: `google/gemini-flash-1.5` — fast, low-cost, strong prose quality. Defined as named
constant `OPENROUTER_DEFAULT_MODEL` at the top of `SceneDraftService`.

If streaming responses are desired later, the `openai` npm package can be added for a progressive
text-reveal UI. For this iteration, a single-fill approach is appropriate.
