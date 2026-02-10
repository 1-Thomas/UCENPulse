import { RequestHandler } from "express";
import { randomUUID } from "crypto";

export const requestId: RequestHandler = (req, res, next) => {
  const id = req.header("x-request-id") ?? randomUUID();
  (req as any).requestId = id;
  res.setHeader("x-request-id", id);
  next();
};
