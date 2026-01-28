import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import pinoHttp from "pino-http";

dotenv.config();

export const app = express();

app.use(pinoHttp());
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

// Central error handler (consistent responses)
app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err.status ?? 500;
  res.status(status).json({
    error: {
      message: err.message ?? "Internal Server Error",
      code: err.code ?? "INTERNAL_ERROR",
    },
  });
});
