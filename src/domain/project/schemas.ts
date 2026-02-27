import { z } from 'zod';

import { maxSceneContentLength, sceneStatusSchema } from '@/domain/scene/schemas';

const uuidV4Regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const nonNegativeIntegerSchema = z.number().int().min(0);

const projectTitleSchema = z
  .string()
  .trim()
  .min(1, 'Project title is required')
  .max(120, 'Project title must be 120 characters or fewer');

const projectDescriptionSchema = z
  .string()
  .trim()
  .max(500, 'Project description must be 500 characters or fewer');

const projectLanguageSchema = z
  .string()
  .trim()
  .min(2, 'Language is required')
  .max(16, 'Language must be 16 characters or fewer');

const sceneTitleSchema = z.string().trim().min(1).max(120);
const sceneContentSchema = z.string().max(maxSceneContentLength, {
  message: `Scene content exceeds ${maxSceneContentLength} characters.`,
});
const sceneIdSchema = z.string().trim().min(1);

export const projectIdSchema = z
  .string()
  .trim()
  .regex(uuidV4Regex, 'Invalid project id');

export const projectStatsSchema = z.object({
  wordCount: nonNegativeIntegerSchema,
  sceneCount: nonNegativeIntegerSchema,
  chapterCount: nonNegativeIntegerSchema,
});

export const projectSettingsSchema = z.object({
  language: projectLanguageSchema,
  targetWordCount: nonNegativeIntegerSchema.nullable(),
});

export const createProjectInputSchema = z.object({
  title: projectTitleSchema,
  description: projectDescriptionSchema,
  settings: projectSettingsSchema.partial().optional(),
});

export const updateProjectInputSchema = z.object({
  title: projectTitleSchema.optional(),
  description: projectDescriptionSchema.optional(),
  settings: projectSettingsSchema.partial().optional(),
  stats: projectStatsSchema.partial().optional(),
});

export const projectSceneSchema = z.object({
  id: sceneIdSchema,
  projectId: projectIdSchema,
  title: sceneTitleSchema,
  content: sceneContentSchema,
  status: sceneStatusSchema,
  updatedAt: z.string().datetime({ offset: true }),
});

export const writingProjectSchema = z
  .object({
    id: projectIdSchema,
    title: projectTitleSchema,
    description: projectDescriptionSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    stats: projectStatsSchema,
    settings: projectSettingsSchema,
    sceneOrder: z.array(sceneIdSchema),
    scenes: z.record(projectSceneSchema),
  })
  .superRefine((value, context) => {
    for (const sceneId of value.sceneOrder) {
      if (!(sceneId in value.scenes)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing scene reference for ${sceneId}.`,
          path: ['sceneOrder'],
        });
      }
    }

    for (const [sceneId, scene] of Object.entries(value.scenes)) {
      if (scene.id !== sceneId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Scene key ${sceneId} does not match scene.id.`,
          path: ['scenes', sceneId, 'id'],
        });
      }

      if (scene.projectId !== value.id) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Scene ${sceneId} belongs to another project.`,
          path: ['scenes', sceneId, 'projectId'],
        });
      }
    }
  });

const legacyWritingProjectSchema = z.object({
  id: projectIdSchema,
  title: projectTitleSchema,
  description: projectDescriptionSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  stats: projectStatsSchema,
  settings: projectSettingsSchema,
});

export const legacyProjectStorageSchema = z.object({
  version: z.literal(1),
  projects: z.array(legacyWritingProjectSchema),
});

export const projectStorageSchema = z.object({
  version: z.literal(2),
  projects: z.array(writingProjectSchema),
});

export type LegacyProjectStorage = z.infer<typeof legacyProjectStorageSchema>;
export type ProjectStorage = z.infer<typeof projectStorageSchema>;
