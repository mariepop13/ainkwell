import { z } from 'zod';

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

export const writingProjectSchema = z.object({
  id: projectIdSchema,
  title: projectTitleSchema,
  description: projectDescriptionSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  stats: projectStatsSchema,
  settings: projectSettingsSchema,
});

export const projectStorageSchema = z.object({
  version: z.literal(1),
  projects: z.array(writingProjectSchema),
});

export type ProjectStorage = z.infer<typeof projectStorageSchema>;
