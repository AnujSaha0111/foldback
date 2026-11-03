import type { Request, RequestHandler } from "express";
import { AppError } from "../http/errors";
import { currentUser } from "../http/middleware/auth";
import { listContracts, readContract } from "../services/contracts.service";
import type { HoldDeps } from "../services/holds.service";
import { readScheduler } from "../services/projection.service";
import { moveClock, resolveOwned } from "../services/clock.service";
import type { ClockInput } from "./contracts.schemas";

export interface ContractsController {
  list: RequestHandler;
  read: RequestHandler;
  scheduler: RequestHandler;
  clock: RequestHandler;
  resolve: RequestHandler;
}

const CONTRACT_ID = /^con_[A-Za-z0-9_-]{22}$/;

/** The `:id` of a request. A malformed id is "not found", the same as an unknown one, so ids cannot be probed. */
export function parseContractId(req: Request): string {
  const id = req.params["id"];
  if (typeof id !== "string" || !CONTRACT_ID.test(id))
    throw new AppError("not_found", "That plan does not exist.");
  return id;
}

export function createContractsController(deps: HoldDeps): ContractsController {
  const { pool } = deps;
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
    clock: async (req, res) => {
      const body = req.body as ClockInput;
      const viaAgent = req.query["via"] === "agent";
      res.json(
        await moveClock(deps, currentUser(res).id, parseContractId(req), new Date(body.demo_now), viaAgent),
      );
    },
    resolve: async (req, res) => {
      res.json(
        await resolveOwned(deps, currentUser(res).id, parseContractId(req), req.query["via"] === "agent"),
      );
    },
  };
}
