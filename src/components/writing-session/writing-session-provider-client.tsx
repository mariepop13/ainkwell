'use client';

import dynamic from 'next/dynamic';
import type { ReactElement, ReactNode } from 'react';

const WritingSessionProviderLoaded = dynamic(
  () => import('@/context/writing-session-context').then((m) => m.WritingSessionProvider),
  { ssr: false },
);

export function WritingSessionProviderClient({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}): ReactElement {
  return <WritingSessionProviderLoaded projectId={projectId}>{children}</WritingSessionProviderLoaded>;
}
