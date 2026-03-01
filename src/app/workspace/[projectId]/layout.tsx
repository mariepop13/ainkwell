import type { ReactNode } from 'react';

import { WritingSessionProviderClient } from '@/components/writing-session/writing-session-provider-client';
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
    <WritingSessionProviderClient projectId={parsed.data}>
      {children}
    </WritingSessionProviderClient>
  );
}
