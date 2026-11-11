"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAskAgentMutation, useMoveClockMutation, useResolvePlanMutation } from "@/api/contractsApi";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { useClientValue } from "@/hooks/useClientValue";
import { copyText } from "@/lib/copyText";
import { readKept, writeKept } from "@/lib/sessionStore";
import type { AgentDraft, AgentProposal, ApiContract, ApiShare } from "@/types/generated/api-types";
import { Ask, Card, Log, Root, Row, ToolLine, Turn } from "./styled";

type Entry =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; tools: string[]; drafts: AgentDraft[]; proposals: AgentProposal[] }
  | { role: "system"; text: string };

/**
 * The conversation kept in this tab, so a reload does not lose it. Old proposals are dropped: the plan may have moved
 * since, and a proposal is only ever approved from a fresh answer.
 */
function restore(kept: string): Entry[] {
  try {
    const entries = JSON.parse(kept) as Entry[];
    return entries.map((entry) => (entry.role === "assistant" ? { ...entry, proposals: [] } : entry));
  } catch {
    return [];
  }
}

/** The server takes at most 12 turns, so older ones are dropped from what is sent. */
const MAX_TURNS = 12;
const OPEN = new Set(["waiting", "checkout_open", "declined"]);

interface AssistantCardProps {
  contract: ApiContract;
  shares: ApiShare[];
  /** A pending clock move to draw on the schedule, or null when there is none. */
  onProposed: (at: string | null) => void;
}

/** The suggestion chips, each only where it applies (ui.md, Assistant card). */
function chips(contract: ApiContract, shares: ApiShare[]): string[] {
  const unpaid = shares.find((share) => OPEN.has(share.status));
  const closed = contract.status === "kept" || contract.status === "released";
  const beforeDeadline =
    contract.demo_now !== null && contract.deadline_at !== null && contract.demo_now < contract.deadline_at;
  return [
    unpaid ? `What happens if ${unpaid.display_name} doesn't pay?` : null,
    shares.some((share) => share.payable) ? "Draft reminders for anyone unpaid" : null,
    !closed && beforeDeadline ? "Move to the deadline" : null,
  ].filter((chip): chip is string => chip !== null);
}

/** The organizer's assistant. It answers from tools, and everything it suggests waits for the organizer. */
export function AssistantCard({ contract, shares, onProposed }: AssistantCardProps) {
  const [ask, asking] = useAskAgentMutation();
  const key = `foldback:assistant:${contract.id}`;
  const kept = useClientValue(() => readKept(key), "");
  const [live, setEntries] = useState<Entry[] | null>(null);
  const entries = live ?? restore(kept);
  useEffect(() => {
    if (live) writeKept(key, JSON.stringify(live));
  }, [key, live]);
  const [draft, setDraft] = useState("");

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || asking.isLoading) return;
    const history = entries.flatMap((entry) =>
      entry.role === "system" ? [] : [{ role: entry.role, content: entry.text }],
    );
    const messages = [...history, { role: "user" as const, content: question }].slice(-MAX_TURNS);
    setEntries([...entries, { role: "user", text: question }]);
    setDraft("");
    const { data } = await ask({ id: contract.id, messages });
    if (!data) {
      setDraft((now) => now || question);
      return;
    }
    setEntries((now) => [
      ...(now ?? entries),
      {
        role: "assistant",
        text: data.reply,
        tools: data.tool_calls.map((call) => call.summary),
        drafts: data.drafts,
        proposals: data.proposals,
      },
    ]);
    const move = data.proposals.findLast((proposal) => proposal.kind === "move_clock");
    if (move) onProposed(move.demo_now);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send(draft);
  };
  const note = (text: string) => setEntries((now) => [...(now ?? entries), { role: "system", text }]);

  return (
    <Root aria-labelledby="assistant-title">
      <h2 id="assistant-title">Assistant</h2>
      <Log aria-live="polite">
        {entries.map((entry, i) => (
          <Turn key={i} data-role={entry.role}>
            <p>{entry.text}</p>
            {entry.role === "assistant" ? (
              <Extras entry={entry} contractId={contract.id} onProposed={onProposed} onApproved={note} />
            ) : null}
          </Turn>
        ))}
      </Log>
      <Row>
        {chips(contract, shares).map((chip) => (
          <Button key={chip} small variant="secondary" arrow={false} onClick={() => void send(chip)}>
            {chip}
          </Button>
        ))}
      </Row>
      <Ask onSubmit={submit}>
        <input
          aria-label="Ask about this plan"
          placeholder="Ask about this plan…"
          value={draft}
          maxLength={2000}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" small arrow={false} loading={asking.isLoading}>
          Ask
        </Button>
      </Ask>
      <FormError error={asking.error} />
    </Root>
  );
}

interface ExtrasProps {
  entry: Extract<Entry, { role: "assistant" }>;
  contractId: string;
  onProposed: (at: string | null) => void;
  onApproved: (text: string) => void;
}

/** What came with a reply: the tools it used, any reminder drafts, and any proposals to approve. */
function Extras({ entry, contractId, onProposed, onApproved }: ExtrasProps) {
  return (
    <>
      {entry.tools.map((line, i) => (
        <ToolLine key={i}>{line}</ToolLine>
      ))}
      {entry.drafts.map((draft) => (
        <DraftCard key={draft.share_id} draft={draft} />
      ))}
      {entry.proposals.map((proposal) => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          contractId={contractId}
          onProposed={onProposed}
          onApproved={onApproved}
        />
      ))}
    </>
  );
}

function DraftCard({ draft }: { draft: AgentDraft }) {
  const [copied, setCopied] = useState<boolean | null>(null);
  return (
    <Card>
      <strong>Reminder for {draft.display_name}</strong>
      <blockquote>{draft.text}</blockquote>
      <Row>
        <Button
          small
          variant="secondary"
          arrow={false}
          onClick={() => void copyText(draft.text).then(setCopied)}
        >
          {copied === null ? "Copy" : copied ? "Copied" : "Copy failed"}
        </Button>
      </Row>
    </Card>
  );
}

interface ProposalCardProps {
  proposal: AgentProposal;
  contractId: string;
  onProposed: (at: string | null) => void;
  onApproved: (text: string) => void;
}

/** A proposal does nothing until approved, and then runs through the normal clock or resolve route. */
function ProposalCard({ proposal, contractId, onProposed, onApproved }: ProposalCardProps) {
  const [moveClock, moving] = useMoveClockMutation();
  const [resolvePlan, resolving] = useResolvePlanMutation();
  const [done, setDone] = useState(false);
  if (done) return null;

  const approve = async () => {
    const result =
      proposal.kind === "move_clock" && proposal.demo_now
        ? await moveClock({ id: contractId, demoNow: proposal.demo_now, viaAgent: true })
        : await resolvePlan({ id: contractId, viaAgent: true });
    if ("error" in result && result.error) return;
    setDone(true);
    onProposed(null);
    onApproved(`Approved: ${proposal.label}`);
  };
  const dismiss = () => {
    setDone(true);
    onProposed(null);
  };

  return (
    <Card>
      <strong>{proposal.label}</strong>
      <p>{proposal.preview}</p>
      <Row>
        <Button
          small
          variant="ink"
          arrow={false}
          loading={moving.isLoading || resolving.isLoading}
          onClick={() => void approve()}
        >
          Approve
        </Button>
        <Button small variant="secondary" arrow={false} onClick={dismiss}>
          Dismiss
        </Button>
      </Row>
      <FormError error={moving.error ?? resolving.error} />
    </Card>
  );
}
