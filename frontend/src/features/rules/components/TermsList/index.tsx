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
import { Chip, Chips, Confirm, Intro, List, Quote, Row } from "./styled";

interface TermsListProps {
  contractId: string;
  extraction: ApiExtraction;
}

interface TermProps {
  label: string;
  quote: string | null;
  children: ReactNode;
}

function Term({ label, quote, children }: TermProps) {
  return (
    <Row>
      <dt>{label}</dt>
      <dd>
        {children}
        {quote ? <Quote>“{quote}”</Quote> : null}
      </dd>
    </Row>
  );
}

/** Every value with the line it came from. There is no editor: confirm posts back exactly what was read. */
export function TermsList({ contractId, extraction }: TermsListProps) {
  const router = useRouter();
  const [confirmRule, { isLoading, error }] = useConfirmRuleMutation();
  const terms = termsOf(extraction);
  if (!terms) return null;

  const confirm = async () => {
    const result = await confirmRule({ id: contractId, terms });
    if ("data" in result) router.push(`/plans/${contractId}`);
  };

  return (
    <>
      <Intro>Read from your text. Nothing is active until you confirm.</Intro>
      <List>
        <Term label="Plan" quote={quoteFor(extraction, "title")}>
          {terms.title}
        </Term>
        <Term label="Each person pays" quote={quoteFor(extraction, "share_cents")}>
          <Money cents={terms.share_cents} />
        </Term>
        <Term label="Total" quote={quoteFor(extraction, "total_cents")}>
          <Money cents={terms.total_cents} />
        </Term>
        <Term label="People" quote={quoteFor(extraction, "people")}>
          <Chips>
            {terms.people.map((person) => (
              <Chip key={person}>{person}</Chip>
            ))}
          </Chips>
        </Term>
        <Term label="Deadline" quote={quoteFor(extraction, "deadline_at")}>
          {formatMoment(terms.deadline_at, terms.timezone)}
        </Term>
        <Term label="Grace" quote={quoteFor(extraction, "grace_until")}>
          {terms.grace_person_name && terms.grace_until
            ? `${terms.grace_person_name} until ${formatMoment(terms.grace_until, terms.timezone)}`
            : "No grace. Everyone has the same deadline."}
        </Term>
      </List>
      <Confirm>
        <Button variant="blue" disabled={isLoading} onClick={() => void confirm()}>
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
