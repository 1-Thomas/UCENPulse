import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import { authRouter } from "./auth/authRoutes";
import { authRequired, AuthedRequest } from "./auth/authRequired";
import { activityRouter } from "./activities/activityRoutes";
import { metricRouter } from "./metrics/metricRoutes";
import { reportRouter } from "./reports/reportRoutes";

dotenv.config();

export const app = express();

app.use(pinoHttp());
app.use(helmet());


const allowedOrigins = new Set([
  "http://127.0.0.1:5500", 
  "http://localhost:5500",
  "http://127.0.0.1:5501", 
  "http://localhost:5501",
  "http://localhost:5173", 
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      
      if (!origin) return cb(null, true);

 
      if (allowedOrigins.has(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/activities", activityRouter);
app.use("/", metricRouter);
app.use("/reports", reportRouter);

const swaggerDoc = YAML.load("./openapi.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

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
