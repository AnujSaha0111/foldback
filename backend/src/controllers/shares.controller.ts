import type { Request, RequestHandler } from "express";
import { AppError } from "../http/errors";
import { authorizeShare, startCheckout } from "../services/holds.service";
import type { HoldDeps } from "../services/holds.service";
import { readPublicShare } from "../services/shares.service";
import { syncShare } from "../services/sync.service";
import type { AuthorizeInput, SyncInput } from "./shares.schemas";

export interface SharesController {
  read: RequestHandler;
  checkout: RequestHandler;
  authorize: RequestHandler;
  sync: RequestHandler;
}

const SHARE_ID = /^shr_[A-Za-z0-9_-]{22}$/;

/** The `:id` of a request. A malformed id is "not found", the same as an unknown one, so ids cannot be probed. */
function parseShareId(req: Request): string {
  const id = req.params["id"];
  if (typeof id !== "string" || !SHARE_ID.test(id)) {
    throw new AppError("not_found", "That pay link does not exist.");
  }
  return id;
}

export function createSharesController(deps: HoldDeps): SharesController {
  return {
    read: async (req, res) => {
      res.json(await readPublicShare(deps.pool, parseShareId(req)));
    },
    checkout: async (req, res) => {
      res.json(await startCheckout(deps, parseShareId(req)));
    },
    authorize: async (req, res) => {
      const body = req.body as AuthorizeInput;
      res.json(await authorizeShare(deps, parseShareId(req), body.order_id));
    },
    sync: async (req, res) => {
      const body = req.body as SyncInput;
      res.json(await syncShare(deps, parseShareId(req), body.buyer_cancelled === true));
    },
  };
}
