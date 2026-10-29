import type { RequestHandler } from "express";
import type { Pool } from "pg";
import { AppError } from "../http/errors";
import { currentUser } from "../http/middleware/auth";
import { listContracts, readContract } from "../services/contracts.service";

export interface ContractsController {
  list: RequestHandler;
  read: RequestHandler;
}

const CONTRACT_ID = /^con_[A-Za-z0-9_-]{22}$/;

export function createContractsController(pool: Pool): ContractsController {
  return {
    list: async (_req, res) => {
      res.json({ contracts: await listContracts(pool, currentUser(res).id) });
    },
    read: async (req, res) => {
      const id = req.params["id"];
      // A malformed id is "not found", the same as an unknown one, so ids cannot be probed.
      if (typeof id !== "string" || !CONTRACT_ID.test(id))
        throw new AppError("not_found", "That plan does not exist.");
      res.json(await readContract(pool, currentUser(res).id, id));
    },
  };
}
