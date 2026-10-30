import type { Request, RequestHandler } from "express";
import type { Pool } from "pg";
import { AppError } from "../http/errors";
import { currentUser } from "../http/middleware/auth";
import { listContracts, readContract } from "../services/contracts.service";
import { readScheduler } from "../services/projection.service";

export interface ContractsController {
  list: RequestHandler;
  read: RequestHandler;
  scheduler: RequestHandler;
}

const CONTRACT_ID = /^con_[A-Za-z0-9_-]{22}$/;

/** The `:id` of a request. A malformed id is "not found", the same as an unknown one, so ids cannot be probed. */
export function parseContractId(req: Request): string {
  const id = req.params["id"];
  if (typeof id !== "string" || !CONTRACT_ID.test(id))
    throw new AppError("not_found", "That plan does not exist.");
  return id;
}

export function createContractsController(pool: Pool): ContractsController {
  return {
    list: async (_req, res) => {
      res.json({ contracts: await listContracts(pool, currentUser(res).id) });
    },
    read: async (req, res) => {
      res.json(await readContract(pool, currentUser(res).id, parseContractId(req)));
    },
    scheduler: async (req, res) => {
      res.json(await readScheduler(pool, currentUser(res).id, parseContractId(req)));
    },
  };
}
