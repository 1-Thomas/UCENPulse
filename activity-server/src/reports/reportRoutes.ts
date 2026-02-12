import { Router } from "express";
import { prisma } from "../db";
import { authRequired, AuthedRequest } from "../auth/authRequired";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

const summaryQuerySchema = z.object({
  from: z.preprocess(first, z.string().datetime().optional()),
  to: z.preprocess(first, z.string().datetime().optional()),
});

const metricSeriesQuerySchema = z.object({
  name: z.preprocess(first, z.string().min(1).max(50)),
  unit: z.preprocess(first, z.string().max(30).optional()),
  bucket: z.preprocess(first, z.enum(["daily", "monthly", "yearly"]).default("daily")),
  from: z.preprocess(first, z.string().datetime().optional()),
  to: z.preprocess(first, z.string().datetime().optional()),
});

export const reportRouter = Router();
reportRouter.use(authRequired);


reportRouter.get("/summary", async (req: AuthedRequest, res, next) => {
  try {
    const q = summaryQuerySchema.parse(req.query);
    const userId = req.user!.id;

    const where: any = { userId };

    if (q.from || q.to) {
      where.startedAt = {};
      if (q.from) where.startedAt.gte = new Date(q.from);
      if (q.to) where.startedAt.lte = new Date(q.to);
    }

    const activities = await prisma.activity.findMany({
      where,
      include: { metrics: true },
      orderBy: { startedAt: "desc" },
    });

    const totalActivities = activities.length;

    const byType: Record<string, { count: number; minutes: number }> = {};

    for (const a of activities) {
      const type = a.type;
      if (!byType[type]) byType[type] = { count: 0, minutes: 0 };
      byType[type].count += 1;

      if (a.endedAt) {
        const ms = new Date(a.endedAt).getTime() - new Date(a.startedAt).getTime();
        const mins = ms > 0 ? ms / 60000 : 0;
        byType[type].minutes += mins;
      }
    }

    const metricTotals: Record<string, number> = {};
    for (const a of activities) {
      for (const m of a.metrics) {
        const key = `${m.name}:${m.unit ?? ""}`;
        metricTotals[key] = (metricTotals[key] ?? 0) + Number(m.value);
      }
    }

    const metrics = Object.entries(metricTotals).map(([k, total]) => {
      const [name, unit] = k.split(":");
      return { name, unit: unit || null, total };
    });

    res.json({
      range: { from: q.from ?? null, to: q.to ?? null },
      totalActivities,
      byType,
      metrics,
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return next({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid query",
        details: err.issues,
      });
    }
    next(err);
  }
});


reportRouter.get("/metric-series", async (req: AuthedRequest, res, next) => {
  try {
    const q = metricSeriesQuerySchema.parse(req.query);
    const userId = req.user!.id;

    const trunc =
      q.bucket === "daily" ? "day" :
      q.bucket === "monthly" ? "month" :
      "year";

    const from = q.from ? new Date(q.from) : null;
    const to = q.to ? new Date(q.to) : null;

   
    const rows = await prisma.$queryRaw<Array<{ bucket: Date; value: number }>>(
    Prisma.sql`
      WITH bucketed AS (
        SELECT
          (
            date_trunc(${Prisma.raw(`'${trunc}'`)}, m."recordedAt" AT TIME ZONE 'Europe/London')
            AT TIME ZONE 'Europe/London'
          ) AS bucket,
          m."value"::float AS value,
          m."recordedAt" AS recorded_at
        FROM "Metric" m
        JOIN "Activity" a ON a."id" = m."activityId"
        WHERE a."userId" = ${userId}
          AND m."name" = ${q.name}
          AND (${q.unit ?? null}::text IS NULL OR COALESCE(m."unit",'') = COALESCE(${q.unit ?? ""},''))
          AND (${from}::timestamptz IS NULL OR m."recordedAt" >= ${from})
          AND (${to}::timestamptz IS NULL OR m."recordedAt" <= ${to})
      )
      SELECT DISTINCT ON (bucket)
        bucket,
        value
      FROM bucketed
      ORDER BY bucket ASC, recorded_at DESC
    `
  );

  res.json({
    name: q.name,
    unit: q.unit ?? null,
    bucket: q.bucket,
    labels: rows.map((r) => r.bucket.toISOString()),
    values: rows.map((r) => Number(r.value)),
  });
    } catch (err: any) {
      if (err?.name === "ZodError") {
        return next({
          status: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid query",
          details: err.issues,
        });
      }
      next(err);
    }
  });
