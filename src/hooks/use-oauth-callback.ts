import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { AiSettingsService } from '@/application/ai/ai-settings-service';
import { LocalAiSettingsRepository } from '@/data/ai/local-ai-settings-repository';
import { exchangeAuthCodeForApiKey } from '@/lib/openrouter-oauth';

type OAuthCallbackStatus = 'loading' | 'success' | 'error';

export type UseOAuthCallbackResult = {
  status: OAuthCallbackStatus;
  errorMessage: string | null;
};

const REDIRECT_DELAY_MS = 2000;

function createAiSettingsService(): AiSettingsService {
  return new AiSettingsService(new LocalAiSettingsRepository());
}

export function useOAuthCallback(): UseOAuthCallbackResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<OAuthCallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function processCallback(): Promise<void> {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        const knownErrors: Record<string, string> = {
          access_denied: 'Access was denied. Please try again.',
          invalid_scope: 'Invalid permissions requested.',
          server_error: 'OpenRouter encountered a server error. Please try again later.',
          temporarily_unavailable: 'OpenRouter is temporarily unavailable. Please try again later.',
        };
        setErrorMessage(knownErrors[error] ?? 'Connection failed. Please try again.');
        setStatus('error');
        return;
      }

      if (!code) {
        setErrorMessage('No authorization code received.');
        setStatus('error');
        return;
      }

      try {
        const apiKey = await exchangeAuthCodeForApiKey(code, state ?? undefined);
        const service = createAiSettingsService();
        service.saveKey(apiKey);
        setStatus('success');
        timeoutId = setTimeout(() => router.push('/workspace'), REDIRECT_DELAY_MS);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    }

    void processCallback();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchParams, router]);

  return { status, errorMessage };
}
