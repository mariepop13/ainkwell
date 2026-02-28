import type {
  BibleEntity,
  BibleEntityFilters,
  BibleRelationship,
  BibleRelationshipFilters,
  BibleSceneLink,
  BibleSceneLinkFilters,
  ProjectScene,
} from '@/domain/bible/types';

export interface BibleRepository {
  listEntities(projectId: string, filters?: BibleEntityFilters): BibleEntity[];
  getEntity(projectId: string, entityId: string): BibleEntity | null;
  upsertEntity(entity: BibleEntity): BibleEntity;
  deleteEntity(projectId: string, entityId: string): void;
  listRelationships(projectId: string, filters?: BibleRelationshipFilters): BibleRelationship[];
  upsertRelationship(relationship: BibleRelationship): BibleRelationship;
  deleteRelationship(projectId: string, relationshipId: string): void;
  listSceneLinks(projectId: string, filters?: BibleSceneLinkFilters): BibleSceneLink[];
  upsertSceneLink(sceneLink: BibleSceneLink): BibleSceneLink;
  deleteSceneLink(projectId: string, sceneLinkId: string): void;
  listScenes(projectId: string): ProjectScene[];
  upsertScene(scene: ProjectScene): ProjectScene;
  bulkSeedScenes(projectId: string, scenes: ProjectScene[]): ProjectScene[];
}
