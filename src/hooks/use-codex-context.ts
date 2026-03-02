import { useEffect, useRef, useState } from 'react';

import type { BibleService } from '@/application/bible/bible-service';
import type { BibleEntity } from '@/domain/bible/types';

const DEBOUNCE_MS = 800;
const MAX_MATCHES = 10;

type UseCodexContextInput = {
  projectId: string;
  content: string;
  service: BibleService;
};

type UseCodexContextResult = {
  matchedEntities: BibleEntity[];
};

export function useCodexContext({ projectId, content, service }: UseCodexContextInput): UseCodexContextResult {
  const [matchedEntities, setMatchedEntities] = useState<BibleEntity[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const entities = service.listEntities(projectId);
      const matches = findMentionedEntities(content, entities);
      setMatchedEntities(matches.slice(0, MAX_MATCHES));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, projectId, service]);

  return { matchedEntities };
}

function findMentionedEntities(content: string, entities: BibleEntity[]): BibleEntity[] {
  if (!content.trim()) return [];
  const mentioned: BibleEntity[] = [];
  const seenIds = new Set<string>();

  for (const entity of entities) {
    if (seenIds.has(entity.id)) continue;
    const pattern = new RegExp(`\\b${escapeRegex(entity.name)}\\b`, 'i');
    if (pattern.test(content)) {
      mentioned.push(entity);
      seenIds.add(entity.id);
    }
  }
  return mentioned;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
