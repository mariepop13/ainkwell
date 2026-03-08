import { generatePKCEPair, type PKCEPair } from '@/lib/pkce';

const OPENROUTER_AUTH_BASE_URL = 'https://openrouter.ai';
const STORAGE_KEY_PKCE = 'ainkwell:oauth:pkce';
const STORAGE_KEY_STATE = 'ainkwell:oauth:state';
const STATE_BYTE_LENGTH = 16;

export interface OAuthExchangeResponse {
  key: string;
  user_id: string | null;
}

function generateRandomState(): string {
  const array = new Uint8Array(STATE_BYTE_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function initiateOAuthFlow(callbackUrl: string): Promise<void> {
  const pkce = await generatePKCEPair();
  const state = generateRandomState();

  sessionStorage.setItem(STORAGE_KEY_PKCE, JSON.stringify(pkce));
  sessionStorage.setItem(STORAGE_KEY_STATE, state);

  const params = new URLSearchParams({
    callback_url: callbackUrl,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.codeChallengeMethod,
    state,
  });

  window.location.href = `${OPENROUTER_AUTH_BASE_URL}/auth?${params.toString()}`;
}

export async function exchangeAuthCodeForApiKey(
  code: string,
  state?: string,
): Promise<string> {
  const storedState = sessionStorage.getItem(STORAGE_KEY_STATE);
  const storedPKCE = sessionStorage.getItem(STORAGE_KEY_PKCE);

  if (state && storedState !== state) {
    throw new Error('Invalid state parameter. Please restart the connection flow.');
  }

  if (!storedPKCE) {
    throw new Error('Session data not found. Please restart the connection flow.');
  }

  const pkce: PKCEPair = JSON.parse(storedPKCE);

  const response = await fetch(`${OPENROUTER_AUTH_BASE_URL}/api/v1/auth/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: pkce.codeVerifier,
      code_challenge_method: pkce.codeChallengeMethod,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange auth code: ${response.status}`);
  }

  const data = (await response.json()) as OAuthExchangeResponse;

  sessionStorage.removeItem(STORAGE_KEY_PKCE);
  sessionStorage.removeItem(STORAGE_KEY_STATE);

  return data.key;
}
