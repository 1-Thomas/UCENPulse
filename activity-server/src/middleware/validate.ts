import { ZodSchema } from "zod";
import { RequestHandler } from "express";

export function validateBody(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      return next({ status: 400, code: "VALIDATION_ERROR", message: "Invalid input", details: r.error.issues });
    }
    req.body = r.data;
    next();
  };
}
