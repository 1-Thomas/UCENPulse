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

// POST /activities/:activityId/metrics
metricRouter.post(
  "/activities/:activityId/metrics",
  async (req: AuthedRequest, res, next) => {
    try {
      const input = createMetricSchema.parse(req.body);
      const activityId = String(req.params.activityId);
      const userId = req.user!.id;

      const owns = await prisma.activity.findFirst({
        where: { id: activityId, userId },
      });
      if (!owns)
        return next({ status: 404, code: "NOT_FOUND", message: "Activity not found" });

      const metric = await prisma.metric.create({
        data: {
          activityId,
          name: input.name,
          unit: input.unit,
          value: input.value,
          recordedAt: input.recordedAt
            ? new Date(input.recordedAt)
            : undefined,
        },
      });

      res.status(201).json(metric);
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
  }
);

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