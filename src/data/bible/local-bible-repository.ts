import { bibleEntitySchema, bibleRelationshipSchema, bibleSceneLinkSchema, bibleStorageSchema, projectSceneSchema, projectScenesSchema } from '@/domain/bible/schemas';
import type { BibleRepository } from '@/domain/bible/repository';
import type {
  BibleEntity,
  BibleEntityFilters,
  BibleRelationship,
  BibleRelationshipFilters,
  BibleSceneLink,
  BibleSceneLinkFilters,
  BibleStorageDocument,
  ProjectScene,
} from '@/domain/bible/types';

function cloneEmptyBibleStorage(): BibleStorageDocument {
  return {
    entities: [],
    relationships: [],
    sceneLinks: [],
  };
}

function normalizeProjectId(projectId: string): string {
  const normalizedProjectId = projectId.trim();
  if (!normalizedProjectId) {
    throw new Error('projectId is required');
  }
  return normalizedProjectId;
}

function parseJson(rawValue: string | null): unknown | null {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return null;
  }
}

function toComparableDate(value: string): number {
  const numericDate = Date.parse(value);
  return Number.isNaN(numericDate) ? 0 : numericDate;
}

function toSearchHaystack(entity: BibleEntity): string {
  return [entity.name, entity.summary, entity.tags.join(' ')].join(' ').toLowerCase();
}

function upsertRecord<T extends { id: string }>(records: T[], record: T): void {
  const index = records.findIndex((item) => item.id === record.id);
  if (index < 0) {
    records.push(record);
  } else {
    records[index] = record;
  }
}

const noOpStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  length: 0,
};

const unavailableStorage: Storage = {
  getItem: () => null,
  setItem: () => { throw new Error('Storage backend is unavailable'); },
  removeItem: () => { throw new Error('Storage backend is unavailable'); },
  clear: () => { throw new Error('Storage backend is unavailable'); },
  key: () => null,
  length: 0,
};

export class LocalBibleRepository implements BibleRepository {
  private readonly storage: Storage;
  private readonly bibleCache = new Map<string, BibleStorageDocument>();
  private readonly scenesCache = new Map<string, ProjectScene[]>();

  public constructor(storage?: Storage) {
    if (storage) {
      this.storage = storage;
      return;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
      return;
    }

    this.storage = typeof window === 'undefined' ? noOpStorage : unavailableStorage;
  }

  public listEntities(projectId: string, filters?: BibleEntityFilters): BibleEntity[] {
    const { entities } = this.readBible(projectId);
    const category = filters?.category;
    const searchTerm = filters?.search?.trim().toLowerCase();
    const tags = filters?.tags;

    return entities
      .filter((entity) => (category ? entity.category === category : true))
      .filter((entity) => (searchTerm ? toSearchHaystack(entity).includes(searchTerm) : true))
      .filter((entity) => {
        if (!tags || tags.length === 0) return true;
        const entityTagSet = new Set(entity.tags);
        return tags.every((tag) => entityTagSet.has(tag));
      })
      .sort((left, right) => toComparableDate(right.updatedAt) - toComparableDate(left.updatedAt));
  }

  public listAllTags(projectId: string): string[] {
    const { entities } = this.readBible(projectId);
    const tagSet = new Set<string>();
    for (const entity of entities) {
      for (const tag of entity.tags) tagSet.add(tag);
    }
    return Array.from(tagSet).sort();
  }

  public getEntity(projectId: string, entityId: string): BibleEntity | null {
    const normalizedProjectId = normalizeProjectId(projectId);
    const normalizedEntityId = entityId.trim();
    if (!normalizedEntityId) {
      return null;
    }

    const { entities } = this.readBible(normalizedProjectId);
    return entities.find((entity) => entity.id === normalizedEntityId) ?? null;
  }

  public upsertEntity(entity: BibleEntity): BibleEntity {
    const parsedEntity = bibleEntitySchema.parse(entity);
    const normalizedProjectId = normalizeProjectId(parsedEntity.projectId);
    const bibleStorage = this.readBible(normalizedProjectId);
    upsertRecord(bibleStorage.entities, parsedEntity);
    this.writeBible(normalizedProjectId, bibleStorage);
    return parsedEntity;
  }

  public deleteEntity(projectId: string, entityId: string): void {
    const normalizedProjectId = normalizeProjectId(projectId);
    const normalizedEntityId = entityId.trim();
    const bibleStorage = this.readBible(normalizedProjectId);

    bibleStorage.entities = bibleStorage.entities.filter((entity) => entity.id !== normalizedEntityId);
    bibleStorage.relationships = bibleStorage.relationships.filter(
      (relationship) =>
        relationship.fromEntityId !== normalizedEntityId && relationship.toEntityId !== normalizedEntityId,
    );
    bibleStorage.sceneLinks = bibleStorage.sceneLinks.filter((sceneLink) => sceneLink.entityId !== normalizedEntityId);
    this.writeBible(normalizedProjectId, bibleStorage);
  }

  public listRelationships(projectId: string, filters?: BibleRelationshipFilters): BibleRelationship[] {
    const { relationships } = this.readBible(projectId);
    const relationshipType = filters?.type;
    const fromEntityId = filters?.fromEntityId;
    const toEntityId = filters?.toEntityId;
    const entityId = filters?.entityId;

    return relationships.filter((relationship) => {
      if (relationshipType && relationship.type !== relationshipType) {
        return false;
      }
      if (fromEntityId && relationship.fromEntityId !== fromEntityId) {
        return false;
      }
      if (toEntityId && relationship.toEntityId !== toEntityId) {
        return false;
      }
      if (entityId && relationship.fromEntityId !== entityId && relationship.toEntityId !== entityId) {
        return false;
      }
      return true;
    });
  }

  public upsertRelationship(relationship: BibleRelationship): BibleRelationship {
    const parsedRelationship = bibleRelationshipSchema.parse(relationship);
    const normalizedProjectId = normalizeProjectId(parsedRelationship.projectId);
    const bibleStorage = this.readBible(normalizedProjectId);
    upsertRecord(bibleStorage.relationships, parsedRelationship);
    this.writeBible(normalizedProjectId, bibleStorage);
    return parsedRelationship;
  }

  public deleteRelationship(projectId: string, relationshipId: string): void {
    const normalizedProjectId = normalizeProjectId(projectId);
    const normalizedRelationshipId = relationshipId.trim();
    const bibleStorage = this.readBible(normalizedProjectId);

    bibleStorage.relationships = bibleStorage.relationships.filter(
      (relationship) => relationship.id !== normalizedRelationshipId,
    );
    this.writeBible(normalizedProjectId, bibleStorage);
  }

  public listSceneLinks(projectId: string, filters?: BibleSceneLinkFilters): BibleSceneLink[] {
    const { sceneLinks } = this.readBible(projectId);
    const entityId = filters?.entityId;
    const sceneId = filters?.sceneId;

    return sceneLinks.filter((sceneLink) => {
      if (entityId && sceneLink.entityId !== entityId) {
        return false;
      }
      if (sceneId && sceneLink.sceneId !== sceneId) {
        return false;
      }
      return true;
    });
  }

  public upsertSceneLink(sceneLink: BibleSceneLink): BibleSceneLink {
    const parsedSceneLink = bibleSceneLinkSchema.parse(sceneLink);
    const normalizedProjectId = normalizeProjectId(parsedSceneLink.projectId);
    const bibleStorage = this.readBible(normalizedProjectId);
    upsertRecord(bibleStorage.sceneLinks, parsedSceneLink);
    this.writeBible(normalizedProjectId, bibleStorage);
    return parsedSceneLink;
  }

  public deleteSceneLink(projectId: string, sceneLinkId: string): void {
    const normalizedProjectId = normalizeProjectId(projectId);
    const normalizedSceneLinkId = sceneLinkId.trim();
    const bibleStorage = this.readBible(normalizedProjectId);

    bibleStorage.sceneLinks = bibleStorage.sceneLinks.filter((sceneLink) => sceneLink.id !== normalizedSceneLinkId);
    this.writeBible(normalizedProjectId, bibleStorage);
  }

  public listScenes(projectId: string): ProjectScene[] {
    const normalizedProjectId = normalizeProjectId(projectId);
    const projectScenes = this.readScenes(normalizedProjectId);
    return projectScenes.sort((left, right) => left.order - right.order);
  }

  public upsertScene(scene: ProjectScene): ProjectScene {
    const parsedScene = projectSceneSchema.parse(scene);
    const normalizedProjectId = normalizeProjectId(parsedScene.projectId);
    const projectScenes = this.readScenes(normalizedProjectId);
    upsertRecord(projectScenes, parsedScene);
    this.writeScenes(normalizedProjectId, projectScenes);
    return parsedScene;
  }

  public bulkSeedScenes(projectId: string, scenes: ProjectScene[]): ProjectScene[] {
    const normalizedProjectId = normalizeProjectId(projectId);
    const existingScenes = this.readScenes(normalizedProjectId);
    if (existingScenes.length > 0) {
      return existingScenes.sort((left, right) => left.order - right.order);
    }

    const parsedScenes = scenes
      .map((scene) => projectSceneSchema.parse(scene))
      .filter((scene) => scene.projectId === normalizedProjectId);

    this.writeScenes(normalizedProjectId, parsedScenes);
    return parsedScenes.sort((left, right) => left.order - right.order);
  }

  private readBible(projectId: string): BibleStorageDocument {
    const normalizedProjectId = normalizeProjectId(projectId);

    if (!this.bibleCache.has(normalizedProjectId)) {
      const rawValue = this.storage.getItem(this.bibleStorageKey(normalizedProjectId));
      const parsedValue = parseJson(rawValue);
      const parsedStorage = parsedValue ? bibleStorageSchema.safeParse(parsedValue) : null;
      this.bibleCache.set(
        normalizedProjectId,
        parsedStorage?.success
          ? { entities: parsedStorage.data.entities, relationships: parsedStorage.data.relationships, sceneLinks: parsedStorage.data.sceneLinks }
          : cloneEmptyBibleStorage(),
      );
    }

    const cached = this.bibleCache.get(normalizedProjectId)!;
    return {
      entities: [...cached.entities],
      relationships: [...cached.relationships],
      sceneLinks: [...cached.sceneLinks],
    };
  }

  private writeBible(projectId: string, bibleStorage: BibleStorageDocument): void {
    const normalizedProjectId = normalizeProjectId(projectId);
    const parsedStorage = bibleStorageSchema.parse(bibleStorage);
    const payload = JSON.stringify(parsedStorage);
    this.storage.setItem(this.bibleStorageKey(normalizedProjectId), payload);
    this.bibleCache.set(normalizedProjectId, { entities: parsedStorage.entities, relationships: parsedStorage.relationships, sceneLinks: parsedStorage.sceneLinks });
  }

  private readScenes(projectId: string): ProjectScene[] {
    const normalizedProjectId = normalizeProjectId(projectId);

    if (!this.scenesCache.has(normalizedProjectId)) {
      const rawValue = this.storage.getItem(this.projectScenesStorageKey(normalizedProjectId));
      const parsedValue = parseJson(rawValue);
      const parsedScenes = parsedValue ? projectScenesSchema.safeParse(parsedValue) : null;
      this.scenesCache.set(normalizedProjectId, parsedScenes?.success ? parsedScenes.data : []);
    }

    return [...this.scenesCache.get(normalizedProjectId)!];
  }

  private writeScenes(projectId: string, scenes: ProjectScene[]): void {
    const normalizedProjectId = normalizeProjectId(projectId);
    const parsedScenes = projectScenesSchema.parse(scenes);
    const payload = JSON.stringify(parsedScenes);
    this.storage.setItem(this.projectScenesStorageKey(normalizedProjectId), payload);
    this.scenesCache.set(normalizedProjectId, parsedScenes);
  }

  private bibleStorageKey(projectId: string): string {
    return `ainkwell:projects:${projectId}:bible:v1`;
  }

  private projectScenesStorageKey(projectId: string): string {
    return `ainkwell:projects:${projectId}:scenes:v1`;
  }
}

export function createEmptyBibleStorage(): BibleStorageDocument {
  return cloneEmptyBibleStorage();
}
