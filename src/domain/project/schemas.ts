import { z } from 'zod';

import { maxSceneContentLength, sceneBeatSchema, sceneStatusSchema } from '@/domain/scene/schemas';

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

export const chapterIdSchema = z.string().trim().min(1);
const chapterTitleSchema = z.string().trim().min(1).max(120);

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
  synopsis: z.string().max(300).optional(),
  beats: z.array(sceneBeatSchema).max(20).optional(),
});

export const projectChapterSchema = z.object({
  id: chapterIdSchema,
  projectId: projectIdSchema,
  title: chapterTitleSchema,
  sceneOrder: z.array(sceneIdSchema),
  wordCount: nonNegativeIntegerSchema,
  createdAt: z.string().datetime({ offset: true }),
});

export const createChapterInputSchema = z.object({
  projectId: projectIdSchema,
  title: chapterTitleSchema,
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
    chapterOrder: z.array(chapterIdSchema),
    chapters: z.record(projectChapterSchema),
    scenes: z.record(projectSceneSchema),
  })
  .superRefine((value, context) => {
    const orderedSceneIds = validateChapterSceneGraph(value, context);
    validateSceneRecordEntries(value.id, orderedSceneIds, value.scenes, context);
  });

function addCustomIssue(
  context: z.RefinementCtx,
  message: string,
  path: Array<string>,
): void {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    message,
    path,
  });
}

function validateChapterSceneGraph(
  value: {
    chapterOrder: string[];
    chapters: Record<string, z.infer<typeof projectChapterSchema>>;
    scenes: Record<string, z.infer<typeof projectSceneSchema>>;
  },
  context: z.RefinementCtx,
): Set<string> {
  const orderedChapterIds = new Set<string>();
  const orderedSceneIds = new Set<string>();

  for (const chapterId of value.chapterOrder) {
    if (orderedChapterIds.has(chapterId)) {
      addCustomIssue(context, `Duplicate chapter reference for ${chapterId}.`, ['chapterOrder']);
      continue;
    }
    orderedChapterIds.add(chapterId);

    if (!(chapterId in value.chapters)) {
      addCustomIssue(context, `Missing chapter for id ${chapterId}.`, ['chapterOrder']);
      continue;
    }

    const chapter = value.chapters[chapterId]!;
    for (const sceneId of chapter.sceneOrder) {
      if (orderedSceneIds.has(sceneId)) {
        addCustomIssue(
          context,
          `Scene ${sceneId} appears in more than one chapter.`,
          ['chapters', chapterId, 'sceneOrder'],
        );
        continue;
      }
      orderedSceneIds.add(sceneId);

      if (!(sceneId in value.scenes)) {
        addCustomIssue(
          context,
          `Missing scene reference for ${sceneId}.`,
          ['chapters', chapterId, 'sceneOrder'],
        );
      }
    }
  }

  for (const chapterId of Object.keys(value.chapters)) {
    if (!orderedChapterIds.has(chapterId)) {
      addCustomIssue(
        context,
        `Chapter ${chapterId} is missing from chapterOrder.`,
        ['chapters', chapterId],
      );
    }
  }

  return orderedSceneIds;
}

function validateSceneRecordEntries(
  projectId: string,
  orderedSceneIds: Set<string>,
  scenes: Record<string, z.infer<typeof projectSceneSchema>>,
  context: z.RefinementCtx,
): void {
  for (const [sceneId, scene] of Object.entries(scenes)) {
    if (!orderedSceneIds.has(sceneId)) {
      addCustomIssue(context, `Scene ${sceneId} is missing from all chapter sceneOrders.`, [
        'scenes',
        sceneId,
      ]);
    }

    if (scene.id !== sceneId) {
      addCustomIssue(context, `Scene key ${sceneId} does not match scene.id.`, [
        'scenes',
        sceneId,
        'id',
      ]);
    }

    if (scene.projectId !== projectId) {
      addCustomIssue(context, `Scene ${sceneId} belongs to another project.`, [
        'scenes',
        sceneId,
        'projectId',
      ]);
    }
  }
}

const legacyWritingProjectSchema = z.object({
  id: projectIdSchema,
  title: projectTitleSchema,
  description: projectDescriptionSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  stats: projectStatsSchema,
  settings: projectSettingsSchema,
});

const legacyV2WritingProjectSchema = z.object({
  id: projectIdSchema,
  title: projectTitleSchema,
  description: projectDescriptionSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  stats: projectStatsSchema,
  settings: projectSettingsSchema,
  sceneOrder: z.array(sceneIdSchema),
  scenes: z.record(projectSceneSchema),
});

export const legacyProjectStorageSchema = z.object({
  version: z.literal(1),
  projects: z.array(legacyWritingProjectSchema),
});

export const v2ProjectStorageSchema = z.object({
  version: z.literal(2),
  projects: z.array(legacyV2WritingProjectSchema),
});

export const projectStorageSchema = z.object({
  version: z.literal(3),
  projects: z.array(writingProjectSchema),
});

export const projectExportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime({ offset: true }),
  project: writingProjectSchema,
  bible: z.unknown().nullable(),
  sessions: z.unknown().nullable(),
});

export type LegacyProjectStorage = z.infer<typeof legacyProjectStorageSchema>;
export type V2ProjectStorage = z.infer<typeof v2ProjectStorageSchema>;
export type ProjectStorage = z.infer<typeof projectStorageSchema>;
