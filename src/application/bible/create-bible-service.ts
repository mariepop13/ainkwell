import { LocalBibleRepository } from '@/data/bible/local-bible-repository';

import { BibleService } from './bible-service';

export function createBibleService(): BibleService {
  return new BibleService(new LocalBibleRepository());
}
