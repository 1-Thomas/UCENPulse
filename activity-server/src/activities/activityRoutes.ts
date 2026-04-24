import { Router } from "express";
import { prisma } from "../db";
import { authRequired, AuthedRequest } from "../auth/authRequired";
import { z } from "zod";
import { getWeather } from "../services/weatherService";

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

const listActivitiesSchema = z.object({
  from: z.preprocess(first, z.string().datetime().optional()),
  to: z.preprocess(first, z.string().datetime().optional()),
  type: z.preprocess(first, z.string().min(1).max(50).optional()),
  take: z.preprocess(first, z.coerce.number().int().min(1).max(100).optional()),
  skip: z.preprocess(first, z.coerce.number().int().min(0).max(10000).optional()),
});

const createActivitySchema = z.object({
  type: z.string().min(1).max(50),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().min(1).max(30)).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

const updateActivitySchema = createActivitySchema.partial();

function toApi(a: any) {
  return {
    ...a,
    tags: Array.isArray(a.tags) ? a.tags.map((t: any) => t.tag.label) : [],
  };
}

export const activityRouter = Router();
activityRouter.use(authRequired);

// GET /activities?from=&to=&type=&take=&skip=
activityRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const q = listActivitiesSchema.parse(req.query);

    const where: any = { userId: req.user!.id };

    if (q.type) where.type = q.type;
    if (q.from || q.to) {
      where.startedAt = {};
      if (q.from) where.startedAt.gte = new Date(q.from);
      if (q.to) where.startedAt.lte = new Date(q.to);
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: q.take ?? 50,
      skip: q.skip ?? 0,
      include: { metrics: true, tags: { include: { tag: true } } },
    });

    res.json({ items: activities.map(toApi) });
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

// POST /activities
activityRouter.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const input = createActivitySchema.parse(req.body);
    const userId = req.user!.id;

    let weather: { temperature?: number; weatherCode?: number } = {};

    if (input.latitude !== undefined && input.longitude !== undefined) {
      try {
        weather = await getWeather(input.latitude, input.longitude);
      } catch (error) {
        console.error("Weather lookup failed:", error);
      }
    }

    const created = await prisma.$transaction(async (tx: any) => {
      const labels = input.tags ?? [];

      const tags = await Promise.all(
        labels.map((label: string) =>
          tx.tag.upsert({
            where: { label },
            create: { label },
            update: {},
          })
        )
      );

      const activity = await tx.activity.create({
        data: {
          userId,
          type: input.type,
          startedAt: new Date(input.startedAt),
          endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
          notes: input.notes,
          latitude: input.latitude,
          longitude: input.longitude,
          tags: { create: tags.map((t: any) => ({ tagId: t.id })) },
        },
        include: { metrics: true, tags: { include: { tag: true } } },
      });

      return { activity, weather };
    });

    res.status(201).json({
      ...toApi(created.activity),
      weather,
    });
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

// GET /activities/:id
activityRouter.get("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const id = String(req.params.id);

    const a = await prisma.activity.findFirst({
      where: { id, userId: req.user!.id },
      include: { metrics: true, tags: { include: { tag: true } } },
    });

    if (!a) {
      return next({ status: 404, code: "NOT_FOUND", message: "Activity not found" });
    }

    res.json(toApi(a));
  } catch (err) {
    next(err);
  }
});

// GET /activities/:id/weather
activityRouter.get("/:id/weather", async (req: AuthedRequest, res, next) => {
  try {
    const id = String(req.params.id);

    const activity = await prisma.activity.findFirst({
      where: { id, userId: req.user!.id },
      select: {
        id: true,
        type: true,
        startedAt: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!activity) {
      return next({ status: 404, code: "NOT_FOUND", message: "Activity not found" });
    }

    if (activity.latitude == null || activity.longitude == null) {
      return res.json({
        id: activity.id,
        type: activity.type,
        startedAt: activity.startedAt,
        weather: null,
        message: "No coordinates stored for this activity",
      });
    }

    const weather = await getWeather(activity.latitude, activity.longitude);

    res.json({
      id: activity.id,
      type: activity.type,
      startedAt: activity.startedAt,
      latitude: activity.latitude,
      longitude: activity.longitude,
      weather,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /activities/:id
activityRouter.patch("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.id;
    const input = updateActivitySchema.parse(req.body);

    const updated = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.activity.findFirst({ where: { id, userId } });
      if (!existing) return null;

      if (input.tags) {
        await tx.activityTag.deleteMany({ where: { activityId: id } });

        const tags = await Promise.all(
          input.tags.map((label: string) =>
            tx.tag.upsert({
              where: { label },
              create: { label },
              update: {},
            })
          )
        );

        await tx.activityTag.createMany({
          data: tags.map((t: any) => ({ activityId: id, tagId: t.id })),
          skipDuplicates: true,
        });
      }

      return tx.activity.update({
        where: { id },
        data: {
          type: input.type,
          startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
          endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
          notes: input.notes,
          latitude: input.latitude,
          longitude: input.longitude,
        },
        include: { metrics: true, tags: { include: { tag: true } } },
      });
    });

    if (!updated) {
      return next({ status: 404, code: "NOT_FOUND", message: "Activity not found" });
    }

    res.json(toApi(updated));
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

// DELETE /activities/:id
activityRouter.delete("/:id", async (req: AuthedRequest, res, next) => {
  try {
    const id = String(req.params.id);
    const userId = req.user!.id;

    const existing = await prisma.activity.findFirst({ where: { id, userId } });
    if (!existing) {
      return next({ status: 404, code: "NOT_FOUND", message: "Activity not found" });
    }

    await prisma.activity.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});