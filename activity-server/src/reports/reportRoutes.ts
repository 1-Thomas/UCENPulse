import { Router } from "express";
import { prisma } from "../db";
import { authRequired, AuthedRequest } from "../auth/authRequired";
import { z } from "zod";

export const reportRouter = Router();
reportRouter.use(authRequired);

// GET /reports/summary
// Aggregates activities by type + total duration
reportRouter.get("/summary", async (req: AuthedRequest, res, next) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { userId: req.user!.id },
      select: {
        type: true,
        startedAt: true,
        endedAt: true,
      },
    });

    const byType: Record<string, { count: number; minutes: number }> = {};

    for (const a of activities) {
      byType[a.type] ??= { count: 0, minutes: 0 };
      byType[a.type].count++;

      if (a.endedAt) {
        const mins =
          (a.endedAt.getTime() - a.startedAt.getTime()) / 60000;
        if (mins > 0) byType[a.type].minutes += mins;
      }
    }

    res.json({
      totalActivities: activities.length,
      byType,
    });
  } catch (err) {
    next(err);
  }
});

// GET /reports/weekly?weeks=8
reportRouter.get("/weekly", async (req: AuthedRequest, res, next) => {
  try {
    const q = z
      .object({
        weeks: z.coerce.number().min(1).max(52).default(8),
      })
      .parse(req.query);

    const end = new Date();
    const start = new Date(
      end.getTime() - q.weeks * 7 * 24 * 60 * 60 * 1000
    );

    const activities = await prisma.activity.findMany({
      where: {
        userId: req.user!.id,
        startedAt: { gte: start, lte: end },
      },
      select: {
        type: true,
        startedAt: true,
        endedAt: true,
      },
    });

    const weeks: Record<string, number> = {};

    for (const a of activities) {
      const week = a.startedAt.toISOString().slice(0, 10);
      weeks[week] ??= 0;
      weeks[week]++;
    }

    res.json({
      range: { start, end },
      weeks,
    });
  } catch (err) {
    next(err);
  }
});
