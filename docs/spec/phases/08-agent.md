# Phase 8 — Organizer agent

Budget: 7 hours. Hats: Rules and UI. Depends on phase 7. Dates: 8–9 November 2026.

## Read

- `ai.md`: Provider, Job 2, Cost and abuse limits
- `api.md`: Organizer agent
- `ui.md`: Assistant card
- `scheduler.md`: the Proposed marker
- `test.md`: phase 8 cases

## Goal

On the board, the organizer asks "What happens if Maya doesn't pay?" and gets an answer backed by a real simulation. They get a reminder with Maya's pay link, and they can approve an agent-proposed clock move that shows as a dashed marker on the schedule first.

## Create

```text
backend/src/integrations/llm/{agentTools,agentRunner}.ts
backend/src/services/agent.service.ts
backend/src/routes/agent.routes.ts  backend/src/controllers/agent.controller.ts
backend/test/integration/agent.test.ts
frontend/src/features/assistant/
```

The agent route goes through the AI guard (per user, per IP, per contract, daily call cap). Every loop iteration is one LLM attempt and gets its own `ai_usage` row. Start on the primary model with `reasoning_effort: "low"`. Raise it to "medium" or switch the primary model only if rehearsal shows wrong tool choices, and record why.

## Do not

- Give any tool a database write or a PayPal call.
- Send `rule_text` to the agent.
- Execute a proposal inside the agent route.
- Use forced `tool_choice`.

## Exit check

- [ ] Phase 8 cases pass. CI is green and deployed.
- [ ] Manual on production: the three chips each give a short, correct answer. Approving "Advance to grace end" releases the holds and the board updates. "Set Maya's share to $1" is refused, and nothing changes.
- [ ] `learn/10-agent.md` is written.

## Exit note

Agent model and why:

Reply latency and cost per turn:
