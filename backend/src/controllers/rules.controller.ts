import type { Request, RequestHandler, Response } from "express";
import type { Pool } from "pg";
import type { Env } from "../config/env";
import { AppError } from "../http/errors";
import { currentUser } from "../http/middleware/auth";
import { hashIp } from "../services/aiBudget.service";
import { confirmContract } from "../services/confirm.service";
import type { ConfirmDeps } from "../services/confirm.service";
import { readContract } from "../services/contracts.service";
import { clarifyContract, createContract } from "../services/extract.service";
import type { Requester, RuleDeps, RuleOutcome } from "../services/extract.service";
import { parseContractId } from "./contracts.controller";
import type { ClarifyInput, ConfirmInput, CreateRuleInput } from "./rules.schemas";

export interface RulesController {
  create: RequestHandler;
  clarify: RequestHandler;
  confirm: RequestHandler;
}

/** A complete reading is a 200. One that needs an answer is the 422 `needs_clarification`, carrying what was read. */
function respond(res: Response, outcome: RuleOutcome): void {
  if (outcome.complete) {
    res.json({ contract_id: outcome.contractId, extraction: outcome.extraction });
    return;
  }
  throw new AppError(
    "needs_clarification",
    outcome.question,
    undefined,
    {},
    {
      contract_id: outcome.contractId,
      missing: outcome.extraction?.missing ?? [],
      extraction: outcome.extraction,
    },
  );
}

export function createRulesController(env: Env, pool: Pool, deps: RuleDeps & ConfirmDeps): RulesController {
  const requester = (req: Request, res: Response): Requester => ({
    userId: currentUser(res).id,
    ipHash: hashIp(env, req.ip ?? "unknown"),
  });
  return {
    create: async (req, res) => {
      const body = req.body as CreateRuleInput;
      respond(
        res,
        await createContract(deps, requester(req, res), {
          ruleText: body.rule_text,
          useFixtureTime: body.use_fixture_time ?? false,
        }),
      );
    },
    clarify: async (req, res) => {
      const body = req.body as ClarifyInput;
      respond(res, await clarifyContract(deps, requester(req, res), parseContractId(req), body.answer));
    },
    confirm: async (req, res) => {
      const userId = currentUser(res).id;
      const contractId = parseContractId(req);
      await confirmContract(deps, userId, contractId, req.body as ConfirmInput);
      res.json(await readContract(pool, userId, contractId));
    },
  };
}
