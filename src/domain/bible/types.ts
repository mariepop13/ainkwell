export const BIBLE_ENTITY_CATEGORIES = ['character', 'location', 'faction', 'lore'] as const;
export type BibleEntityCategory = (typeof BIBLE_ENTITY_CATEGORIES)[number];

export const RELATIONSHIP_TYPES = [
  'ally_of',
  'enemy_of',
  'member_of',
  'located_in',
  'parent_of',
  'sibling_of',
  'mentor_of',
  'rival_of',
  'controls',
  'knows',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export interface BibleEntity {
  id: string;
  projectId: string;
  category: BibleEntityCategory;
  name: string;
  summary: string;
  details: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BibleRelationship {
  id: string;
  projectId: string;
  type: RelationshipType;
  fromEntityId: string;
  toEntityId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BibleSceneLink {
  id: string;
  projectId: string;
  sceneId: string;
  entityId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectScene {
  id: string;
  projectId: string;
  title: string;
  order: number;
}

export interface BibleStorageDocument {
  entities: BibleEntity[];
  relationships: BibleRelationship[];
  sceneLinks: BibleSceneLink[];
}

export interface BibleEntityFilters {
  category?: BibleEntityCategory;
  search?: string;
  tags?: string[];
}

export interface BibleRelationshipFilters {
  entityId?: string;
  fromEntityId?: string;
  toEntityId?: string;
  type?: RelationshipType;
}

export interface BibleSceneLinkFilters {
  entityId?: string;
  sceneId?: string;
}

export interface SaveBibleEntityInput {
  projectId: string;
  entityId?: string;
  category: BibleEntityCategory;
  name: string;
  summary?: string;
  details?: string;
  tags?: string[];
}

export interface SaveBibleRelationshipInput {
  projectId: string;
  relationshipId?: string;
  type: RelationshipType;
  fromEntityId: string;
  toEntityId: string;
  notes?: string;
}

export interface SaveBibleSceneLinkInput {
  projectId: string;
  sceneLinkId?: string;
  sceneId: string;
  entityId: string;
  notes?: string;
}
