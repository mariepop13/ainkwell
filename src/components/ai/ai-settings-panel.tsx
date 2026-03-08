'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import type { AiSettingsService } from '@/application/ai/ai-settings-service';
import { AiSettingsError } from '@/application/ai/ai-settings-service';
import { initiateOAuthFlow } from '@/lib/openrouter-oauth';
import { ModelSelectionDialog } from '@/components/ai/model-selection-dialog';

type Props = {
  service: AiSettingsService;
};

export function AiSettingsPanel({ service }: Props): ReactElement {
  const [hasKey, setHasKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => service.getSelectedModel());

  useEffect(() => {
    setHasKey(service.hasKey());
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, [service]);

  async function handleSave(): Promise<void> {
    setErrorMessage(null);

    if (!keyInput.trim()) {
      setErrorMessage('API key cannot be empty');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await service.validateKey(keyInput);
      if (!isValid) {
        setErrorMessage('Invalid API key. Check your key at openrouter.ai/keys.');
        return;
      }

      service.saveKey(keyInput);
      setHasKey(true);
      setKeyInput('');
      setSavedMessage(true);
      savedTimeoutRef.current = setTimeout(() => setSavedMessage(false), 2000);
    } catch (error) {
      if (error instanceof AiSettingsError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to save API key.');
      }
    } finally {
      setIsVerifying(false);
    }
  }

  function handleModelSelect(modelId: string): void {
    service.saveModel(modelId);
    setSelectedModel(modelId);
  }

  function handleClear(): void {
    service.clearKey();
    setHasKey(false);
    setKeyInput('');
    setErrorMessage(null);
  }

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <h2 className="text-2xl font-headline font-semibold">AI Settings</h2>
      <p className="text-sm text-muted-foreground">
        {hasKey ? 'API key configured.' : 'No API key set.'}
        {savedMessage ? <span className="ml-2 text-green-600 dark:text-green-400">Saved!</span> : null}
      </p>

      <button
        type="button"
        onClick={() =>
          void initiateOAuthFlow(`${window.location.origin}/auth/openrouter/callback`)
        }
        disabled={isVerifying}
        className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        Connect with OpenRouter
      </button>

      <p className="text-xs text-muted-foreground">or enter your key manually</p>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="openrouter-api-key" className="text-xs font-medium">
            OpenRouter API key
          </label>
          <input
            id="openrouter-api-key"
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="sk-or-..."
            className="rounded border bg-background px-3 py-1.5 text-sm w-64"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isVerifying}
          className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isVerifying ? 'Verifying...' : 'Save Key'}
        </button>
        {hasKey ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={isVerifying}
            className="rounded border border-destructive/50 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Key
          </button>
        ) : null}
      </div>

      {errorMessage ? (
        <p aria-live="polite" className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

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

      <p className="text-xs text-muted-foreground">
        Your key is stored only in this browser. It is never sent to any Ainkwell server.{' '}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Get a key at openrouter.ai/keys
        </a>
      </p>
    </section>
  );
}
