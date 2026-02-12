import { z } from "zod";

export const createActivitySchema = z.object({
  type: z.string().min(1).max(50),
  startedAt: z.string().datetime(),      
  endedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(30)).optional(), 
});

export const updateActivitySchema = createActivitySchema.partial();

export const listActivitiesSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: z.string().min(1).max(50).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).max(10000).optional(),
});

export const addMetricSchema = z.object({
  name: z.string().min(1).max(50),
  unit: z.string().max(20).optional(),
  value: z.number(),
  recordedAt: z.string().datetime().optional(),
});

export const updateMetricSchema = addMetricSchema.partial();