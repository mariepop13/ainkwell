import { describe, expect, it, beforeEach } from 'vitest';
import { BibleService, BibleValidationError } from '@/application/bible/bible-service';
import { LocalBibleRepository } from '@/data/bible/local-bible-repository';
import type { BibleEntityCategory } from '@/domain/bible/types';

const PROJECT_A = '8b5d05ea-3f90-4fd4-91cb-c18edfd3de71';
const PROJECT_B = '6a7c61fb-5f70-47d5-aac9-f1f466f13de4';

function createService(projectId?: string): BibleService {
  const repository = new LocalBibleRepository(window.localStorage);
  const service = new BibleService(repository);
  if (projectId) {
    service.seedScenes(projectId);
  }
  return service;
}

describe('LocalBibleRepository and BibleService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('creates entities across all categories', () => {
    const service = createService();
    const categories: BibleEntityCategory[] = ['character', 'location', 'faction', 'lore'];

    for (const category of categories) {
      service.saveEntity({
        projectId: PROJECT_A,
        category,
        name: `Entity ${category}`,
      });
    }

    const entities = service.listEntities(PROJECT_A);
    expect(entities).toHaveLength(categories.length);
    expect(new Set(entities.map((entity) => entity.category))).toEqual(new Set(categories));
  });

  it('rejects relationship creation when entities are not in the same project scope', () => {
    const service = createService();
    const entityA = service.saveEntity({
      projectId: PROJECT_A,
      category: 'character',
      name: 'A',
    });
    const entityB = service.saveEntity({
      projectId: PROJECT_B,
      category: 'location',
      name: 'B',
    });

    expect(() =>
      service.saveRelationship({
        projectId: PROJECT_A,
        type: 'located_in',
        fromEntityId: entityA.id,
        toEntityId: entityB.id,
      }),
    ).toThrow(BibleValidationError);
  });

  it('rejects self references in relationships', () => {
    const service = createService();
    const entity = service.saveEntity({
      projectId: PROJECT_A,
      category: 'character',
      name: 'Solo',
    });

    expect(() =>
      service.saveRelationship({
        projectId: PROJECT_A,
        type: 'knows',
        fromEntityId: entity.id,
        toEntityId: entity.id,
      }),
    ).toThrow('Self references are not allowed');
  });

  it('rejects directional cycles', () => {
    const service = createService();
    const a = service.saveEntity({ projectId: PROJECT_A, category: 'character', name: 'A' });
    const b = service.saveEntity({ projectId: PROJECT_A, category: 'character', name: 'B' });
    const c = service.saveEntity({ projectId: PROJECT_A, category: 'character', name: 'C' });

    service.saveRelationship({
      projectId: PROJECT_A,
      type: 'ally_of',
      fromEntityId: a.id,
      toEntityId: b.id,
    });
    service.saveRelationship({
      projectId: PROJECT_A,
      type: 'ally_of',
      fromEntityId: b.id,
      toEntityId: c.id,
    });

    expect(() =>
      service.saveRelationship({
        projectId: PROJECT_A,
        type: 'ally_of',
        fromEntityId: c.id,
        toEntityId: a.id,
      }),
    ).toThrow('directional cycle');
  });

  it('cascades relationship and scene-link deletion when deleting an entity', () => {
    const service = createService(PROJECT_A);
    const character = service.saveEntity({
      projectId: PROJECT_A,
      category: 'character',
      name: 'Hero',
    });
    const location = service.saveEntity({
      projectId: PROJECT_A,
      category: 'location',
      name: 'Harbor',
    });

    service.saveRelationship({
      projectId: PROJECT_A,
      type: 'located_in',
      fromEntityId: character.id,
      toEntityId: location.id,
    });
    const sceneId = service.listScenes(PROJECT_A)[0].id;
    service.saveSceneLink({
      projectId: PROJECT_A,
      entityId: character.id,
      sceneId,
    });
    service.deleteEntity(PROJECT_A, character.id);

    expect(service.listRelationships(PROJECT_A)).toHaveLength(0);
    expect(service.listSceneLinks(PROJECT_A)).toHaveLength(0);
  });

  it('filters entities by category and search term', () => {
    const service = createService();
    service.saveEntity({
      projectId: PROJECT_A,
      category: 'character',
      name: 'Ari',
      summary: 'Captain of the watch',
      tags: ['leader'],
    });
    service.saveEntity({
      projectId: PROJECT_A,
      category: 'location',
      name: 'Citadel',
      summary: 'Ancient stone bastion',
      tags: ['fortress'],
    });

    const result = service.listEntities(PROJECT_A, {
      category: 'location',
      search: 'stone',
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Citadel');
  });

  it('persists and reloads data from localStorage', () => {
    const service = createService(PROJECT_A);
    service.saveEntity({
      projectId: PROJECT_A,
      category: 'faction',
      name: 'The Tidebound',
    });

    const reloadedService = createService(PROJECT_A);
    const entities = reloadedService.listEntities(PROJECT_A);
    expect(entities).toHaveLength(1);
    expect(entities[0].name).toBe('The Tidebound');
  });
});
