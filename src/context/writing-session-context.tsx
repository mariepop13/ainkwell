'use client';

import { createContext, useEffect, useMemo, type ReactElement, type ReactNode } from 'react';

import { WritingSessionService } from '@/application/writing-session/writing-session-service';
import { LocalWritingSessionRepository } from '@/data/writing-session/local-writing-session-repository';
import { useWritingSession, type UseWritingSessionResult } from '@/hooks/use-writing-session';

export const WritingSessionContext = createContext<UseWritingSessionResult | null>(null);

export function WritingSessionProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}): ReactElement {
  const repository = useMemo(() => new LocalWritingSessionRepository(), []);
  const service = useMemo(() => new WritingSessionService(repository), [repository]);
  const session = useWritingSession({ projectId, service });
  const { stopSession } = session;

  useEffect(() => {
    return () => {
      void stopSession();
    };
  }, [stopSession]);

  return (
    <WritingSessionContext.Provider value={session}>
      {children}
    </WritingSessionContext.Provider>
  );
}
