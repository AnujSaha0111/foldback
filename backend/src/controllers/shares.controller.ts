import type { Request, RequestHandler } from "express";
import type { Pool } from "pg";
import { AppError } from "../http/errors";
import { readPublicShare } from "../services/shares.service";

export interface SharesController {
  read: RequestHandler;
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

export function createSharesController(pool: Pool): SharesController {
  return {
    read: async (req, res) => {
      res.json(await readPublicShare(pool, parseShareId(req)));
    },
  };
}
