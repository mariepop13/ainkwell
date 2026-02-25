import { z } from 'zod';

export const maxSceneContentLength = 200000;

const sceneIdSchema = z.string().min(1);
const projectIdSchema = z.string().min(1);
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

export const projectStoreSchema = z
  .object({
    id: projectIdSchema,
    title: z.string().min(1),
    sceneOrder: z.array(sceneIdSchema),
    scenes: z.record(sceneSchema),
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

export const workspaceStoreSchema = z.object({
  version: z.literal(1),
  projects: z.record(projectStoreSchema),
});

export type WorkspaceStoreV1 = z.infer<typeof workspaceStoreSchema>;
