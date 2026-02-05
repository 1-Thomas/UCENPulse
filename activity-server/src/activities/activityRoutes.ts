import { Router } from "express";
import { prisma } from "../db";
import { authRequired, AuthedRequest } from "../auth/authRequired";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ---- helpers to normalise Express query types (string | string[]) ----
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
});

const updateActivitySchema = createActivitySchema.partial();

type ActivityWithRelations = Prisma.ActivityGetPayload<{
  include: { metrics: true; tags: { include: { tag: true } } };
}>;

function toApi(a: ActivityWithRelations) {
  return {
    ...a,
    tags: a.tags.map((t) => t.tag.label),
  };
}

export const activityRouter = Router();
activityRouter.use(authRequired);

// GET /activities?from=&to=&type=&take=&skip=
activityRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const q = listActivitiesSchema.parse(req.query);

    const where: Prisma.ActivityWhereInput = { userId: req.user!.id };

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

    const created = await prisma.$transaction(async (tx) => {
      const labels = input.tags ?? [];

      const tags = await Promise.all(
        labels.map((label) =>
          tx.tag.upsert({
            where: { label },
            create: { label },
            update: {},
          })
        )
      );

      return tx.activity.create({
        data: {
          userId,
          type: input.type,
          startedAt: new Date(input.startedAt),
          endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
          notes: input.notes,
          tags: { create: tags.map((t) => ({ tagId: t.id })) },
        },
        include: { metrics: true, tags: { include: { tag: true } } },
      });
    });

    res.status(201).json(toApi(created));
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

    if (!a) return next({ status: 404, code: "NOT_FOUND", message: "Activity not found" });

    res.json(toApi(a));
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

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.activity.findFirst({ where: { id, userId } });
      if (!existing) return null;

      if (input.tags) {
        await tx.activityTag.deleteMany({ where: { activityId: id } });

        const tags = await Promise.all(
          input.tags.map((label) =>
            tx.tag.upsert({
              where: { label },
              create: { label },
              update: {},
            })
          )
        );

        await tx.activityTag.createMany({
          data: tags.map((t) => ({ activityId: id, tagId: t.id })),
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
        },
        include: { metrics: true, tags: { include: { tag: true } } },
      });
    });

    if (!updated) return next({ status: 404, code: "NOT_FOUND", message: "Activity not found" });

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
    if (!existing) return next({ status: 404, code: "NOT_FOUND", message: "Activity not found" });

    await prisma.activity.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});