import { useEffect, useMemo, useState } from 'react';
import { createProjectService } from '@/application/project/project-service';
import { buildManuscript } from '@/application/manuscript/manuscript-service';
import { LocalProjectRepository } from '@/data/project/local-project-repository';
import type { Manuscript } from '@/domain/project/types';

type ManuscriptLoadState = 'loading' | 'ready' | 'not-found' | 'error';

type UseManuscriptResult = {
  loadState: ManuscriptLoadState;
  manuscript: Manuscript | null;
};

export function useManuscript(projectId: string): UseManuscriptResult {
  const repository = useMemo(() => new LocalProjectRepository(), []);
  const service = useMemo(() => createProjectService(repository), [repository]);
  const [loadState, setLoadState] = useState<ManuscriptLoadState>('loading');
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);

  useEffect(() => {
    let isMounted = true;

    void service.getProjectById(projectId).then((project) => {
      if (!isMounted) return;
      if (!project) { setLoadState('not-found'); return; }
      setManuscript(buildManuscript(project));
      setLoadState('ready');
    }).catch(() => {
      if (!isMounted) return;
      setLoadState('error');
    });

    return () => { isMounted = false; };
  }, [projectId, service]);

  return { loadState, manuscript };
}
