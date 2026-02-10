import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db";
import { registerSchema, loginSchema } from "../validators/authValidators";
import { signJwt } from "./jwt";
import { validateBody } from "../middleware/validate";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  async (req, res, next) => {
    try {
      const input = req.body as { email: string; password: string; name?: string };

      const existing = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existing) {
        return next({
          status: 409,
          code: "EMAIL_IN_USE",
          message: "Email already in use",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      const user = await prisma.user.create({
        data: { email: input.email, password: passwordHash, name: input.name },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      const accessToken = signJwt({ sub: user.id, email: user.email });

      res.status(201).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  async (req, res, next) => {
    try {
      const input = req.body as { email: string; password: string };

      const user = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!user) {
        return next({
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
        });
      }

      const ok = await bcrypt.compare(input.password, user.password);
      if (!ok) {
        return next({
          status: 401,
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
        });
      }

      const accessToken = signJwt({ sub: user.id, email: user.email });

      res.json({
        user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  }
);
