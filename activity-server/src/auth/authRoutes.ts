import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db";
import { registerSchema, loginSchema } from "../validators/authValidators";
import { signAccessToken } from "./jwt";

export const authRouter = Router();


authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return next({ status: 409, code: "EMAIL_IN_USE", message: "Email already in use" });

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: { email: input.email, password: passwordHash, name: input.name },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = signAccessToken({ sub: user.id, email: user.email });

    res.status(201).json({
      user,
      accessToken: token,
    });
  } catch (err: any) {
    // Zod validation error
    if (err?.name === "ZodError") {
      return next({ status: 400, code: "VALIDATION_ERROR", message: "Invalid input", details: err.issues });
    }
    return next(err);
  }
});


authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) return next({ status: 401, code: "INVALID_CREDENTIALS", message: "Invalid credentials" });

    const ok = await bcrypt.compare(input.password, user.password);
    if (!ok) return next({ status: 401, code: "INVALID_CREDENTIALS", message: "Invalid credentials" });

    const token = signAccessToken({ sub: user.id, email: user.email });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      accessToken: token,
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return next({ status: 400, code: "VALIDATION_ERROR", message: "Invalid input", details: err.issues });
    }
    return next(err);
  }
});
