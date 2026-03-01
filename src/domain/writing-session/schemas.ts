import { z } from 'zod';

const idSchema = z.string().trim().min(1).max(120);
const projectIdSchema = z.string().trim().min(1).max(120);
const timestampSchema = z.string().trim().min(1).max(64);

export const writingSessionSchema = z.object({
  id: idSchema,
  projectId: projectIdSchema,
  startedAt: timestampSchema,
  endedAt: timestampSchema,
  durationSeconds: z.number().int().min(0),
  wordsWritten: z.number().int().min(0),
});

export const projectSessionDataSchema = z.object({
  dailyGoal: z.number().int().min(0).nullable(),
  sessions: z.array(writingSessionSchema).default([]),
});

export const sessionStorageSchema = z.object({
  version: z.literal(1),
  projects: z.record(projectSessionDataSchema).default({}),
});

export const startSessionInputSchema = z.object({
  projectId: projectIdSchema,
  startedAt: timestampSchema.optional(),
});

export const endSessionInputSchema = z.object({
  sessionId: idSchema,
  projectId: projectIdSchema,
  endedAt: timestampSchema.optional(),
  wordsWritten: z.number().int().min(0),
});

export const setDailyGoalInputSchema = z.object({
  projectId: projectIdSchema,
  goal: z.number().int().min(0).nullable(),
});
