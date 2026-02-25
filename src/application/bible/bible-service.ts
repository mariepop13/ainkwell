import type { BibleRepository } from '@/domain/bible/repository';
import { bibleEntitySchema, bibleRelationshipSchema, bibleSceneLinkSchema, projectSceneSchema } from '@/domain/bible/schemas';
import type {
  BibleEntity,
  BibleEntityFilters,
  BibleRelationship,
  BibleRelationshipFilters,
  BibleSceneLink,
  BibleSceneLinkFilters,
  ProjectScene,
  SaveBibleEntityInput,
  SaveBibleRelationshipInput,
  SaveBibleSceneLinkInput,
} from '@/domain/bible/types';

export class BibleValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'BibleValidationError';
  }
}

const DEFAULT_SCENES = ['Scene 1', 'Scene 2', 'Scene 3'] as const;

export class BibleService {
  private readonly repository: BibleRepository;

  private readonly now: () => string;

  public constructor(repository: BibleRepository, nowProvider: () => string = () => new Date().toISOString()) {
    this.repository = repository;
    this.now = nowProvider;
  }

  public seedScenes(projectId: string): ProjectScene[] {
    const normalizedProjectId = this.normalizeProjectId(projectId);
    const defaultScenes = DEFAULT_SCENES.map((title, index) =>
      projectSceneSchema.parse({
        id: `${normalizedProjectId}-scene-${index + 1}`,
        projectId: normalizedProjectId,
        title,
        order: index,
      }),
    );

    return this.repository.bulkSeedScenes(normalizedProjectId, defaultScenes);
  }

  public listScenes(projectId: string): ProjectScene[] {
    return this.repository.listScenes(this.normalizeProjectId(projectId));
  }

  public listEntities(projectId: string, filters?: BibleEntityFilters): BibleEntity[] {
    return this.repository.listEntities(this.normalizeProjectId(projectId), filters);
  }

  public getEntity(projectId: string, entityId: string): BibleEntity | null {
    return this.repository.getEntity(this.normalizeProjectId(projectId), entityId);
  }

  public saveEntity(input: SaveBibleEntityInput): BibleEntity {
    const normalizedProjectId = this.normalizeProjectId(input.projectId);
    const normalizedEntityId = input.entityId?.trim();
    const existingEntity = normalizedEntityId
      ? this.repository.getEntity(normalizedProjectId, normalizedEntityId)
      : null;
    const now = this.now();
    const entity = bibleEntitySchema.parse({
      id: existingEntity?.id ?? this.generateId(),
      projectId: normalizedProjectId,
      category: input.category,
      name: input.name.trim(),
      summary: (input.summary ?? '').trim(),
      details: (input.details ?? '').trim(),
      tags: this.sanitizeTags(input.tags ?? []),
      createdAt: existingEntity?.createdAt ?? now,
      updatedAt: now,
    });

    return this.repository.upsertEntity(entity);
  }

  public deleteEntity(projectId: string, entityId: string): void {
    this.repository.deleteEntity(this.normalizeProjectId(projectId), entityId.trim());
  }

  public listRelationships(projectId: string, filters?: BibleRelationshipFilters): BibleRelationship[] {
    return this.repository.listRelationships(this.normalizeProjectId(projectId), filters);
  }

  public saveRelationship(input: SaveBibleRelationshipInput): BibleRelationship {
    const normalizedProjectId = this.normalizeProjectId(input.projectId);
    this.ensureDistinctRelationshipEndpoints(input.fromEntityId, input.toEntityId);
    this.ensureRelationshipProjectScope(normalizedProjectId, input.fromEntityId, input.toEntityId);
    const relationship = this.buildRelationship(normalizedProjectId, input);
    this.ensureNoRelationshipCycle(normalizedProjectId, relationship);
    return this.repository.upsertRelationship(relationship);
  }

  public deleteRelationship(projectId: string, relationshipId: string): void {
    this.repository.deleteRelationship(this.normalizeProjectId(projectId), relationshipId.trim());
  }

  public listSceneLinks(projectId: string, filters?: BibleSceneLinkFilters): BibleSceneLink[] {
    return this.repository.listSceneLinks(this.normalizeProjectId(projectId), filters);
  }

  public saveSceneLink(input: SaveBibleSceneLinkInput): BibleSceneLink {
    const normalizedProjectId = this.normalizeProjectId(input.projectId);
    const entity = this.requireEntity(normalizedProjectId, input.entityId);
    const scene = this.requireScene(normalizedProjectId, input.sceneId);
    if (entity.projectId !== normalizedProjectId || scene.projectId !== normalizedProjectId) {
      throw new BibleValidationError('Scene links cannot cross project boundaries');
    }

    const sceneLinkId = input.sceneLinkId?.trim();
    const existingSceneLink = sceneLinkId
      ? this.repository.listSceneLinks(normalizedProjectId).find((sceneLink) => sceneLink.id === sceneLinkId)
      : null;
    const now = this.now();
    const sceneLink = bibleSceneLinkSchema.parse({
      id: existingSceneLink?.id ?? this.generateId(),
      projectId: normalizedProjectId,
      sceneId: input.sceneId,
      entityId: input.entityId,
      notes: (input.notes ?? '').trim(),
      createdAt: existingSceneLink?.createdAt ?? now,
      updatedAt: now,
    });

    return this.repository.upsertSceneLink(sceneLink);
  }

  public deleteSceneLink(projectId: string, sceneLinkId: string): void {
    this.repository.deleteSceneLink(this.normalizeProjectId(projectId), sceneLinkId.trim());
  }

  private normalizeProjectId(projectId: string): string {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      throw new BibleValidationError('A valid projectId is required');
    }
    return normalizedProjectId;
  }

  private sanitizeTags(tags: string[]): string[] {
    const uniqueTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
    if (uniqueTags.length > 12) {
      throw new BibleValidationError('A maximum of 12 tags is allowed');
    }
    return uniqueTags;
  }

  private requireEntity(projectId: string, entityId: string): BibleEntity {
    const entity = this.repository.getEntity(projectId, entityId.trim());
    if (!entity) {
      throw new BibleValidationError(`Entity not found: ${entityId}`);
    }
    return entity;
  }

  private requireScene(projectId: string, sceneId: string): ProjectScene {
    const scene = this.repository.listScenes(projectId).find((projectScene) => projectScene.id === sceneId);
    if (!scene) {
      throw new BibleValidationError(`Scene not found: ${sceneId}`);
    }
    return scene;
  }

  private wouldCreateCycle(candidate: BibleRelationship, relationships: BibleRelationship[]): boolean {
    const otherRelationships = relationships.filter((relationship) => relationship.id !== candidate.id);
    const adjacencyMap = new Map<string, Set<string>>();

    for (const relationship of otherRelationships) {
      const neighbors = adjacencyMap.get(relationship.fromEntityId) ?? new Set<string>();
      neighbors.add(relationship.toEntityId);
      adjacencyMap.set(relationship.fromEntityId, neighbors);
    }

    const candidateNeighbors = adjacencyMap.get(candidate.fromEntityId) ?? new Set<string>();
    candidateNeighbors.add(candidate.toEntityId);
    adjacencyMap.set(candidate.fromEntityId, candidateNeighbors);
    return this.hasPath(adjacencyMap, candidate.toEntityId, candidate.fromEntityId);
  }

  private hasPath(adjacencyMap: Map<string, Set<string>>, sourceId: string, targetId: string): boolean {
    const visited = new Set<string>();
    const stack = [sourceId];

    while (stack.length > 0) {
      const currentEntityId = stack.pop();
      if (!currentEntityId || visited.has(currentEntityId)) {
        continue;
      }
      if (currentEntityId === targetId) {
        return true;
      }

      visited.add(currentEntityId);
      const neighbors = adjacencyMap.get(currentEntityId);
      if (!neighbors) {
        continue;
      }

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }

    return false;
  }

  private ensureDistinctRelationshipEndpoints(fromEntityId: string, toEntityId: string): void {
    if (fromEntityId === toEntityId) {
      throw new BibleValidationError('Self references are not allowed');
    }
  }

  private ensureRelationshipProjectScope(projectId: string, fromEntityId: string, toEntityId: string): void {
    const fromEntity = this.requireEntity(projectId, fromEntityId);
    const toEntity = this.requireEntity(projectId, toEntityId);
    if (fromEntity.projectId !== projectId || toEntity.projectId !== projectId) {
      throw new BibleValidationError('Relationships cannot cross project boundaries');
    }
  }

  private buildRelationship(
    projectId: string,
    input: SaveBibleRelationshipInput,
  ): BibleRelationship {
    const existingRelationship = this.findRelationship(projectId, input.relationshipId);
    const now = this.now();

    return bibleRelationshipSchema.parse({
      id: existingRelationship?.id ?? this.generateId(),
      projectId,
      type: input.type,
      fromEntityId: input.fromEntityId,
      toEntityId: input.toEntityId,
      notes: (input.notes ?? '').trim(),
      createdAt: existingRelationship?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private findRelationship(projectId: string, relationshipId?: string): BibleRelationship | null {
    const normalizedRelationshipId = relationshipId?.trim();
    if (!normalizedRelationshipId) {
      return null;
    }

    return (
      this.repository
        .listRelationships(projectId)
        .find((relationship) => relationship.id === normalizedRelationshipId) ?? null
    );
  }

  private ensureNoRelationshipCycle(projectId: string, relationship: BibleRelationship): void {
    const allRelationships = this.repository.listRelationships(projectId);
    if (this.wouldCreateCycle(relationship, allRelationships)) {
      throw new BibleValidationError('The relationship introduces a directional cycle');
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    const randomPart = Math.random().toString(36).slice(2, 10);
    const timePart = Date.now().toString(36);
    return `${timePart}-${randomPart}`;
  }
}
