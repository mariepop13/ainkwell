import Link from 'next/link';
import type { ReactElement } from 'react';

interface WorkspacePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps): Promise<ReactElement> {
  const { projectId } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">Project</p>
        <h1 className="text-3xl font-headline font-bold">{projectId}</h1>
      </header>
      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-xl font-headline font-semibold">Workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your narrative references and keep continuity aligned with the Story Bible.
        </p>
        <div className="mt-4">
          <Link
            href={`/workspace/${projectId}/bible`}
            className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Open Story Bible
          </Link>
        </div>
      </section>
    </main>
  );
}
