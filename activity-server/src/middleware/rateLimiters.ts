import rateLimit from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";

function key(req: any): string {
 
  const h = req.header?.("x-test-key");
  return (isTest && typeof h === "string" && h.length > 0)
    ? h
    : (req.ip ?? "unknown");
}

export const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: isTest ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => key(req),
});

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: isTest ? 200 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => key(req),
});
