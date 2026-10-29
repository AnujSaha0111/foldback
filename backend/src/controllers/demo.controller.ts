import type { RequestHandler } from "express";
import type { Pool } from "pg";
import { currentUser } from "../http/middleware/auth";
import { resetDemoData } from "../services/demo.service";

export interface DemoController {
  reset: RequestHandler;
}

export function createDemoController(pool: Pool): DemoController {
  return {
    reset: async (_req, res) => {
      res.json(await resetDemoData(pool, currentUser(res).id));
    },
  };
}
