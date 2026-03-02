'use client';

import Link from 'next/link';
import { type ReactElement, useEffect, useState } from 'react';

import { seedDevData } from '@/lib/seed-dev-data';

type SeedState = 'seeding' | 'done' | 'error';

export function DevSeedClient(): ReactElement {
  const [state, setState] = useState<SeedState>('seeding');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seedDevData()
      .then(() => setState('done'))
      .catch((err: unknown) => {
        setState('error');
        setError(err instanceof Error ? err.message : 'Unexpected error');
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 font-mono text-sm">
      {state === 'seeding' && <p className="text-muted-foreground">Seeding dev data…</p>}
      {state === 'done' && (
        <>
          <p className="text-green-600">✓ Dev data seeded successfully</p>
          <Link href="/workspace" className="underline">
            Go to workspace →
          </Link>
        </>
      )}
      {state === 'error' && (
        <p className="text-destructive">✗ Seed failed: {error}</p>
      )}
    </main>
  );
}
