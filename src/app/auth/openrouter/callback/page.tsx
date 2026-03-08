'use client';

import { Suspense, type ReactElement } from 'react';
import { useOAuthCallback } from '@/hooks/use-oauth-callback';

function CallbackContent(): ReactElement {
  const { status, errorMessage } = useOAuthCallback();

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-4xl">✓</span>
        <p className="font-medium">OpenRouter connected!</p>
        <p className="text-sm text-muted-foreground">Redirecting to workspace…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-4xl">✗</span>
        <p className="font-medium text-destructive">Connection failed</p>
        {errorMessage ? (
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        ) : null}
        <a
          href="/workspace"
          className="mt-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to workspace
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-muted-foreground">Connecting to OpenRouter…</p>
    </div>
  );
}

export default function OpenRouterCallbackPage(): ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-card-foreground shadow-sm">
        <Suspense
          fallback={
            <p className="text-center text-sm text-muted-foreground">Loading…</p>
          }
        >
          <CallbackContent />
        </Suspense>
      </div>
    </main>
  );
}
