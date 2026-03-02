import { z } from 'zod';

export const maxSceneContentLength = 200000;

const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const sceneIdSchema = z.string().min(1);
const projectIdSchema = z.string().trim().regex(uuidV4Pattern, 'Invalid project id');
const legacyProjectIdSchema = z.string().trim().min(1);
const sceneContentSchema = z.string().max(maxSceneContentLength, {
  message: `Scene content exceeds ${maxSceneContentLength} characters.`,
});
const updatedAtSchema = z.string().datetime({ offset: true });

export const sceneStatusSchema = z.enum(['draft', 'revise', 'final']);

export const beatTypeSchema = z.enum([
  'setup',
  'conflict',
  'resolution',
  'action',
  'dialogue',
  'revelation',
]);
export type BeatType = z.infer<typeof beatTypeSchema>;

export const sceneBeatSchema = z.object({
  id: z.string().min(1),
  content: z.string().max(200),
  type: beatTypeSchema,
});
export type SceneBeat = z.infer<typeof sceneBeatSchema>;

export const sceneSchema = z.object({
  id: sceneIdSchema,
  projectId: projectIdSchema,
  title: z.string().min(1),
  content: sceneContentSchema,
  status: sceneStatusSchema,
  updatedAt: updatedAtSchema,
  synopsis: z.string().max(300).optional(),
  beats: z.array(sceneBeatSchema).max(20).optional(),
});

export const sceneSummarySchema = sceneSchema.pick({
  id: true,
  projectId: true,
  title: true,
  status: true,
  updatedAt: true,
});

export const saveSceneInputSchema = z.object({
  projectId: projectIdSchema,
  sceneId: sceneIdSchema,
  content: sceneContentSchema,
  status: sceneStatusSchema,
  updatedAt: updatedAtSchema,
  synopsis: z.string().max(300).optional(),
  beats: z.array(sceneBeatSchema).max(20).optional(),
});

const legacySceneSchema = z.object({
  id: sceneIdSchema,
  projectId: legacyProjectIdSchema,
  title: z.string().min(1),
  content: sceneContentSchema,
  status: sceneStatusSchema,
  updatedAt: updatedAtSchema,
});

export const projectStoreSchema = z
  .object({
    id: legacyProjectIdSchema,
    title: z.string().min(1),
    sceneOrder: z.array(sceneIdSchema),
    scenes: z.record(legacySceneSchema),
  })
  .superRefine((value, context) => {
    const orderedIds = validateSceneOrder(value.sceneOrder, value.scenes, context);
    validateSceneRecords(value.id, orderedIds, value.scenes, context);
  });

function addValidationIssue(
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

function validateSceneOrder(
  sceneOrder: string[],
  scenes: Record<string, z.infer<typeof legacySceneSchema>>,
  context: z.RefinementCtx,
): Set<string> {
  const orderedIds = new Set<string>();

  for (const sceneId of sceneOrder) {
    if (orderedIds.has(sceneId)) {
      addValidationIssue(context, `Duplicate scene reference for ${sceneId}.`, ['sceneOrder']);
      continue;
    }

    orderedIds.add(sceneId);
    if (!(sceneId in scenes)) {
      addValidationIssue(context, `Missing scene reference for ${sceneId}.`, ['sceneOrder']);
    }
  }

  return orderedIds;
}

function validateSceneRecords(
  projectId: string,
  orderedIds: Set<string>,
  scenes: Record<string, z.infer<typeof legacySceneSchema>>,
  context: z.RefinementCtx,
): void {
  for (const [sceneId, scene] of Object.entries(scenes)) {
    if (!orderedIds.has(sceneId)) {
      addValidationIssue(context, `Scene ${sceneId} is not present in sceneOrder.`, ['scenes', sceneId]);
    }

    if (scene.id !== sceneId) {
      addValidationIssue(context, `Scene key ${sceneId} does not match scene.id.`, [
        'scenes',
        sceneId,
        'id',
      ]);
    }

    if (scene.projectId !== projectId) {
      addValidationIssue(context, `Scene ${sceneId} belongs to another project.`, [
        'scenes',
        sceneId,
        'projectId',
      ]);
    }
  }
}

export const workspaceStoreSchema = z.object({
  version: z.literal(1),
  projects: z.record(projectStoreSchema),
});

export type WorkspaceStoreV1 = z.infer<typeof workspaceStoreSchema>;
