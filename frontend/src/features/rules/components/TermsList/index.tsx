"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useConfirmRuleMutation } from "@/api/contractsApi";
import { Button } from "@/components/Button";
import { FormError } from "@/components/FormError";
import { Money } from "@/components/Money";
import { formatMoment } from "@/lib/format";
import type { ApiExtraction } from "@/types/generated/api-types";
import { termsOf } from "@/types/generated/terms";
import { quoteFor } from "../../reading";
import { Chip, Chips, Confirm, Initial, Intro, List, Quote, Row } from "./styled";

interface TermsListProps {
  contractId: string;
  extraction: ApiExtraction;
  /** Called with the field a term was read from while the pointer is on it, and null when it leaves. */
  onPoint?: (field: string | null) => void;
}

interface TermProps {
  label: string;
  quote: string | null;
  onPoint: () => void;
  onLeave: () => void;
  children: ReactNode;
}

function Term({ label, quote, onPoint, onLeave, children }: TermProps) {
  return (
    <Row onPointerEnter={onPoint} onPointerLeave={onLeave}>
      <dt>{label}</dt>
      <dd>
        {children}
        {quote ? <Quote>“{quote}”</Quote> : null}
      </dd>
    </Row>
  );
}

/** Every value with the line it came from. There is no editor: confirm posts back exactly what was read. */
export function TermsList({ contractId, extraction, onPoint }: TermsListProps) {
  const router = useRouter();
  const [confirmRule, { isLoading, error }] = useConfirmRuleMutation();
  const terms = termsOf(extraction);
  if (!terms) return null;

  // Each term says which field it shows, so the transcript can light up the line it came from.
  const term = (label: string, field: string) => ({
    label,
    quote: quoteFor(extraction, field),
    onPoint: () => onPoint?.(field),
    onLeave: () => onPoint?.(null),
  });

  const confirm = async () => {
    const result = await confirmRule({ id: contractId, terms });
    if ("data" in result) router.push(`/plans/${contractId}`);
  };

  return (
    <>
      <Intro>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 8.5l3.5 3.5 7.5-8" />
        </svg>
        Read from your text. Nothing is active until you confirm.
      </Intro>
      <List>
        <Term {...term("Plan", "title")}>{terms.title}</Term>
        <Term {...term("Each person pays", "share_cents")}>
          <Money cents={terms.share_cents} />
        </Term>
        <Term {...term("Total", "total_cents")}>
          <Money cents={terms.total_cents} />
        </Term>
        <Term {...term("People", "people")}>
          <Chips>
            {terms.people.map((person) => (
              <Chip key={person}>
                <Initial aria-hidden="true">{person[0]}</Initial>
                {person}
              </Chip>
            ))}
          </Chips>
        </Term>
        <Term {...term("Deadline", "deadline_at")}>{formatMoment(terms.deadline_at, terms.timezone)}</Term>
        <Term {...term("Grace", "grace_until")}>
          {terms.grace_person_name && terms.grace_until
            ? `${terms.grace_person_name} until ${formatMoment(terms.grace_until, terms.timezone)}`
            : "No grace. Everyone has the same deadline."}
        </Term>
      </List>
      <Confirm>
        <Button variant="sun" disabled={isLoading} onClick={() => void confirm()}>
          {isLoading ? "Confirming…" : "Confirm these terms"}
        </Button>
        <FormError error={error} />
        <p>
          Each person gets a PayPal link that holds their share. If everyone pays by the deadline, Foldback
          captures every hold. If not, every hold is released and nobody is charged.
        </p>
      </Confirm>
    </>
  );
}
