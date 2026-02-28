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

export class LocalBibleRepository implements BibleRepository {
  private readonly storage: Storage;

  public constructor(storage?: Storage) {
    if (storage) {
      this.storage = storage;
      return;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
      return;
    }

    throw new Error('Storage backend is unavailable');
  }

  public listEntities(projectId: string, filters?: BibleEntityFilters): BibleEntity[] {
    const { entities } = this.readBible(projectId);
    const category = filters?.category;
    const searchTerm = filters?.search?.trim().toLowerCase();

    return entities
      .filter((entity) => (category ? entity.category === category : true))
      .filter((entity) => (searchTerm ? toSearchHaystack(entity).includes(searchTerm) : true))
      .sort((left, right) => toComparableDate(right.updatedAt) - toComparableDate(left.updatedAt));
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
    const entityIndex = bibleStorage.entities.findIndex((item) => item.id === parsedEntity.id);

    if (entityIndex < 0) {
      bibleStorage.entities.push(parsedEntity);
    } else {
      bibleStorage.entities[entityIndex] = parsedEntity;
    }

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
    const relationshipIndex = bibleStorage.relationships.findIndex(
      (item) => item.id === parsedRelationship.id,
    );

    if (relationshipIndex < 0) {
      bibleStorage.relationships.push(parsedRelationship);
    } else {
      bibleStorage.relationships[relationshipIndex] = parsedRelationship;
    }

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
    const sceneLinkIndex = bibleStorage.sceneLinks.findIndex((item) => item.id === parsedSceneLink.id);

    if (sceneLinkIndex < 0) {
      bibleStorage.sceneLinks.push(parsedSceneLink);
    } else {
      bibleStorage.sceneLinks[sceneLinkIndex] = parsedSceneLink;
    }

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
    const sceneIndex = projectScenes.findIndex((item) => item.id === parsedScene.id);

    if (sceneIndex < 0) {
      projectScenes.push(parsedScene);
    } else {
      projectScenes[sceneIndex] = parsedScene;
    }

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
    const rawValue = this.storage.getItem(this.bibleStorageKey(normalizedProjectId));
    const parsedValue = parseJson(rawValue);

    if (!parsedValue) {
      return cloneEmptyBibleStorage();
    }

    const parsedStorage = bibleStorageSchema.safeParse(parsedValue);
    if (!parsedStorage.success) {
      return cloneEmptyBibleStorage();
    }

    return {
      entities: [...parsedStorage.data.entities],
      relationships: [...parsedStorage.data.relationships],
      sceneLinks: [...parsedStorage.data.sceneLinks],
    };
  }

  private writeBible(projectId: string, bibleStorage: BibleStorageDocument): void {
    const normalizedProjectId = normalizeProjectId(projectId);
    const parsedStorage = bibleStorageSchema.parse(bibleStorage);
    const payload = JSON.stringify(parsedStorage);
    this.storage.setItem(this.bibleStorageKey(normalizedProjectId), payload);
  }

  private readScenes(projectId: string): ProjectScene[] {
    const normalizedProjectId = normalizeProjectId(projectId);
    const rawValue = this.storage.getItem(this.projectScenesStorageKey(normalizedProjectId));
    const parsedValue = parseJson(rawValue);

    if (!parsedValue) {
      return [];
    }

    const parsedScenes = projectScenesSchema.safeParse(parsedValue);
    if (!parsedScenes.success) {
      return [];
    }

    return [...parsedScenes.data];
  }

  private writeScenes(projectId: string, scenes: ProjectScene[]): void {
    const normalizedProjectId = normalizeProjectId(projectId);
    const parsedScenes = projectScenesSchema.parse(scenes);
    const payload = JSON.stringify(parsedScenes);
    this.storage.setItem(this.projectScenesStorageKey(normalizedProjectId), payload);
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
