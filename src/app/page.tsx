import Link from 'next/link';
import type { ReactElement } from 'react';

export default function HomePage(): ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-2xl rounded-lg border bg-card p-6 text-card-foreground">
        <h1 className="mb-3 text-2xl font-headline font-bold">Ainkwell OSS is ready</h1>
        <p className="text-muted-foreground">Run locally with no cloud account required.</p>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            Start development with <code className="rounded bg-muted px-2 py-1">npm run dev</code>.
          </p>
          <p>Workspace is ready for local project management.</p>
          <p>
            <Link className="font-medium text-primary underline" href="/workspace">
              Open Project Workspace
            </Link>
          </p>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/workspace"
            className="inline-flex rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Open Project Workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
