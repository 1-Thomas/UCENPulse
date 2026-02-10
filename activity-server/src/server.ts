import express from "express";
import cors from "cors";
import helmet from "helmet";

import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import { authRouter } from "./auth/authRoutes";
import { authRequired, AuthedRequest } from "./auth/authRequired";
import { activityRouter } from "./activities/activityRoutes";
import { metricRouter } from "./metrics/metricRoutes";
import { reportRouter } from "./reports/reportRoutes";
import { authLimiter, apiLimiter } from "./middleware/rateLimiters";

import { requestId } from "./middleware/requestId";
import { prisma } from "./db";



export const app = express();
app.use(requestId);
app.use(
  pinoHttp({
    enabled: process.env.NODE_ENV !== "test",
  })
);

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/ready", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (e) {
    next({ status: 503, code: "NOT_READY", message: "Database not ready" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));


const swaggerDoc = YAML.load("./openapi.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));



app.use("/auth", authLimiter, authRouter);
app.use(apiLimiter);

app.use("/activities", activityRouter);
app.use("/", metricRouter);
app.use("/reports", reportRouter);


app.get("/me", authRequired, (req: AuthedRequest, res) => {
  res.json({ me: req.user });
});

app.use((err: any, req: any, res: any, _next: any) => {
  const status = err.status ?? 500;

  res.status(status).json({
    error: {
      message: err.message ?? "Internal Server Error",
      code: err.code ?? "INTERNAL_ERROR",
      details: err.details,
      requestId: req.requestId,
    },
  });
});







const allowedOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
app.use(cors({ origin: allowedOrigin, credentials: true }));




