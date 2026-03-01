import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import { projectIdSchema } from '@/domain/project/schemas';

const WritingSessionProvider = dynamic(
  () => import('@/context/writing-session-context').then((m) => m.WritingSessionProvider),
  { ssr: false },
);

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}): Promise<ReactNode> {
  const { projectId: projectIdParam } = await params;
  const parsed = projectIdSchema.safeParse(projectIdParam);

  if (!parsed.success) {
    return <>{children}</>;
  }

  return (
    <WritingSessionProvider projectId={parsed.data}>
      {children}
    </WritingSessionProvider>
  );
}
