import { Router } from "express";
import { prisma } from "../db";
import { authRequired, AuthedRequest } from "../auth/authRequired";
import { z } from "zod";

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

const summaryQuerySchema = z.object({
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
        const key = `${m.name}:${m.unit}`;
        metricTotals[key] = (metricTotals[key] ?? 0) + Number(m.value);
      }
    }

    const metrics = Object.entries(metricTotals).map(([k, total]) => {
      const [name, unit] = k.split(":");
      return { name, unit, total };
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
