import type { ReactElement } from 'react';
import { BiblePageClient } from '@/components/bible/bible-page-client';

interface BiblePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function BiblePage({ params }: BiblePageProps): Promise<ReactElement> {
  const { projectId } = await params;
  return <BiblePageClient key={projectId} projectId={projectId} />;
}
