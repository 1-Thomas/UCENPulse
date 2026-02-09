import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "./jwt";

export type AuthedRequest = Request & { user?: { id: string; email: string } };

export function authRequired(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next({ status: 401, code: "UNAUTHORIZED", message: "Missing Bearer token" });
  }

  try {
    const payload = verifyJwt(token);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return next({ status: 401, code: "UNAUTHORIZED", message: "Invalid or expired token" });
  }
}
