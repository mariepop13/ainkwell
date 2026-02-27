import Link from 'next/link';
import type { ReactElement } from 'react';
import { BiblePageClient } from '@/components/bible/bible-page-client';
import { projectIdSchema } from '@/domain/project/schemas';

interface BiblePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function BiblePage({ params }: BiblePageProps): Promise<ReactElement> {
  const { projectId } = await params;
  const parsedProjectId = projectIdSchema.safeParse(projectId);

  if (!parsedProjectId.success) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-center gap-3 px-4">
        <h1 className="text-2xl font-headline font-semibold">Invalid project id</h1>
        <p className="text-sm text-muted-foreground">
          The Story Bible route requires a valid project identifier.
        </p>
        <Link className="text-sm font-medium text-primary underline" href="/workspace">
          Back to workspace
        </Link>
      </main>
    );
  }

  return <BiblePageClient key={parsedProjectId.data} projectId={parsedProjectId.data} />;
}
