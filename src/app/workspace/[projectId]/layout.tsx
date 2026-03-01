import type { ReactNode } from 'react';

import { WritingSessionProvider } from '@/context/writing-session-context';
import { projectIdSchema } from '@/domain/project/schemas';

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
