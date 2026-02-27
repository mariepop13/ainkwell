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

export const sceneSchema = z.object({
  id: sceneIdSchema,
  projectId: projectIdSchema,
  title: z.string().min(1),
  content: sceneContentSchema,
  status: sceneStatusSchema,
  updatedAt: updatedAtSchema,
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
    const orderedIds = new Set<string>();

    for (const sceneId of value.sceneOrder) {
      if (orderedIds.has(sceneId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate scene reference for ${sceneId}.`,
          path: ['sceneOrder'],
        });
        continue;
      }

      orderedIds.add(sceneId);
      if (!(sceneId in value.scenes)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing scene reference for ${sceneId}.`,
          path: ['sceneOrder'],
        });
      }
    }

    for (const [sceneId, scene] of Object.entries(value.scenes)) {
      if (!orderedIds.has(sceneId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Scene ${sceneId} is not present in sceneOrder.`,
          path: ['scenes', sceneId],
        });
      }

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

export const workspaceStoreSchema = z.object({
  version: z.literal(1),
  projects: z.record(projectStoreSchema),
});

export type WorkspaceStoreV1 = z.infer<typeof workspaceStoreSchema>;
