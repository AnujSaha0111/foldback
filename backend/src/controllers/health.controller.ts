import type { RequestHandler } from "express";
import type { Pool } from "pg";
import type { Env } from "../config/env";
import { healthSummary, readiness } from "../services/health.service";

export interface HealthController {
  live: RequestHandler;
  ready: RequestHandler;
  summary: RequestHandler;
}

export function createHealthController(env: Env, pool: Pool): HealthController {
  return {
    live: (_req, res) => {
      res.json({ status: "ok" });
    },
    ready: async (_req, res) => {
      const status = await readiness(pool);
      res.status(status === "ok" ? 200 : 503).json({ status });
    },
    summary: async (_req, res) => {
      res.json(await healthSummary(env, pool));
    },
  };
}
