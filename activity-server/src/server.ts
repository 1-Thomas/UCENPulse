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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));


const swaggerDoc = YAML.load("./openapi.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));


app.use("/auth", authRouter);


app.use("/activities", activityRouter);
app.use("/", metricRouter);
app.use("/reports", reportRouter);


app.get("/me", authRequired, (req: AuthedRequest, res) => {
  res.json({ me: req.user });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err.status ?? 500;
  res.status(status).json({
    error: {
      message: err.message ?? "Internal Server Error",
      code: err.code ?? "INTERNAL_ERROR",
      details: err.details,
    },
  });
});
