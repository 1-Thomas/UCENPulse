import { Router } from "express";
import { prisma } from "../db";
import { authRequired, AuthedRequest } from "../auth/authRequired";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const metricRouter = Router();
metricRouter.use(authRequired);

const createMetricSchema = z.object({
  name: z.string().min(1).max(50),
  unit: z.string().max(20).optional(),
  value: z.number(),
  recordedAt: z.string().datetime().optional(),
});

const updateMetricSchema = createMetricSchema.partial();


metricRouter.post("/activities/:activityId/metrics", async (req: AuthedRequest, res, next) => {
  try {
    const input = createMetricSchema.parse(req.body);
    const activityId = String(req.params.activityId);
    const userId = req.user!.id;

    const owns = await prisma.activity.findFirst({
      where: { id: activityId, userId },
    });
    if (!owns) {
      return next({ status: 404, code: "NOT_FOUND", message: "Activity not found" });
    }

    
    const recordedAt = new Date();
    const unit = input.unit ?? null;

    
    const existing = await prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT m."id"
        FROM "Metric" m
        WHERE m."activityId" = ${activityId}
          AND m."name" = ${input.name}
          AND COALESCE(m."unit",'') = COALESCE(${unit ?? ""},'')
          AND (m."recordedAt" AT TIME ZONE 'Europe/London')::date
              = (${recordedAt}::timestamptz AT TIME ZONE 'Europe/London')::date
        ORDER BY m."recordedAt" DESC
        LIMIT 1
      `
    );

    const result = await prisma.$transaction(async (tx) => {
      if (existing.length > 0) {
        const keepId = existing[0].id;


        const updated = await tx.metric.update({
          where: { id: keepId },
          data: {
            name: input.name,
            unit,
            value: input.value,     
            recordedAt,             
          },
        });

      
        await tx.$executeRaw(
          Prisma.sql`
            DELETE FROM "Metric"
            WHERE "activityId" = ${activityId}
              AND "name" = ${input.name}
              AND COALESCE("unit",'') = COALESCE(${unit ?? ""},'')
              AND ("recordedAt" AT TIME ZONE 'Europe/London')::date
                  = (${recordedAt}::timestamptz AT TIME ZONE 'Europe/London')::date
              AND "id" <> ${keepId}
          `
        );

        return { status: 200, metric: updated };
      }

      
      const created = await tx.metric.create({
        data: {
          activityId,
          name: input.name,
          unit,
          value: input.value,
          recordedAt,
        },
      });

      return { status: 201, metric: created };
    });

    res.status(result.status).json(result.metric);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return next({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: err.issues,
      });
    }
    next(err);
  }
});




// PATCH /metrics/:id
metricRouter.patch("/metrics/:id", async (req: AuthedRequest, res, next) => {
  try {
    const id = String(req.params.id);
    const input = updateMetricSchema.parse(req.body);
    const userId = req.user!.id;

    const existing = await prisma.metric.findFirst({
      where: { id, activity: { userId } },
    });
    if (!existing)
      return next({ status: 404, code: "NOT_FOUND", message: "Metric not found" });

    const updated = await prisma.metric.update({
      where: { id },
      data: {
        name: input.name,
        unit: input.unit,
        value: input.value,
        recordedAt: input.recordedAt
          ? new Date(input.recordedAt)
          : undefined,
      },
    });

    res.json(updated);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return next({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: err.issues,
      });
    }
    next(err);
  }
});

// DELETE /metrics/:id
metricRouter.delete("/metrics/:id", async (req: AuthedRequest, res, next) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.id;

    const existing = await prisma.metric.findFirst({
      where: { id, activity: { userId } },
    });
    if (!existing)
      return next({ status: 404, code: "NOT_FOUND", message: "Metric not found" });

    await prisma.metric.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});