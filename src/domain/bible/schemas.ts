import { z } from 'zod';
import { BIBLE_ENTITY_CATEGORIES, RELATIONSHIP_TYPES } from '@/domain/bible/types';

const idSchema = z.string().trim().min(1).max(120);
const projectIdSchema = z.string().trim().min(1).max(120);
const timestampSchema = z.string().trim().min(1).max(64);
const trimmedStringSchema = z.string().trim();

export const bibleEntitySchema = z.object({
  id: idSchema,
  projectId: projectIdSchema,
  category: z.enum(BIBLE_ENTITY_CATEGORIES),
  name: trimmedStringSchema.min(1).max(120),
  summary: trimmedStringSchema.max(280),
  details: trimmedStringSchema.max(5000),
  tags: z.array(trimmedStringSchema.min(1).max(30)).max(12),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const bibleRelationshipSchema = z
  .object({
    id: idSchema,
    projectId: projectIdSchema,
    type: z.enum(RELATIONSHIP_TYPES),
    fromEntityId: idSchema,
    toEntityId: idSchema,
    notes: trimmedStringSchema.max(500),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .refine((relationship) => relationship.fromEntityId !== relationship.toEntityId, {
    message: 'Self references are not allowed',
    path: ['toEntityId'],
  });

export const bibleSceneLinkSchema = z.object({
  id: idSchema,
  projectId: projectIdSchema,
  sceneId: idSchema,
  entityId: idSchema,
  notes: trimmedStringSchema.max(500),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const projectSceneSchema = z.object({
  id: idSchema,
  projectId: projectIdSchema,
  title: trimmedStringSchema.min(1).max(160),
  order: z.number().int().min(0),
});

export const bibleStorageSchema = z.object({
  entities: z.array(bibleEntitySchema).default([]),
  relationships: z.array(bibleRelationshipSchema).default([]),
  sceneLinks: z.array(bibleSceneLinkSchema).default([]),
});

export const projectScenesSchema = z.array(projectSceneSchema).default([]);
