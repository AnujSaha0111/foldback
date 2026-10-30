import { Reveal } from "@/components/Reveal";
import { Steps } from "@/components/Steps";
import { Muted, Section, Split } from "../../styled";

const HOW_IT_WORKS = [
  {
    title: "Paste the group chat",
    body: "The assistant reads the amount, the people and the deadline, and quotes the line it used for each.",
  },
  {
    title: "Confirm the terms",
    body: "Nothing is active until you confirm. Code checks the math, not the model.",
  },
  {
    title: "Everyone holds their share",
    body: "Each friend opens a link on their phone and approves a PayPal hold. No card form.",
  },
  {
    title: "Kept or released",
    body: "Everyone in by the deadline: captured. Anyone short: every hold is voided and nobody is charged.",
  },
];

const ASSISTANT = [
  {
    title: "Simulates",
    body: "Ask what happens if Maya misses Monday. It runs the real rule and tells you.",
  },
  { title: "Drafts", body: "Reminders with each person's own pay link, ready to copy." },
  {
    title: "Proposes",
    body: "Moves like “advance to the deadline” wait for your approval. It never moves money itself.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how" aria-labelledby="how-title">
      <Split>
        <Reveal>
          <h2 id="how-title">How it works</h2>
          <Muted>
            From a messy group chat to a settled trip, with the organizer approving every step that matters.
          </Muted>
        </Reveal>
        <Reveal>
          <Steps steps={HOW_IT_WORKS} ordered />
        </Reveal>
      </Split>
    </Section>
  );
}

export function AssistantRoles() {
  return (
    <Section aria-labelledby="assistant-title" $layer>
      <Split>
        <Reveal>
          <h2 id="assistant-title">The assistant suggests. Code decides.</h2>
        </Reveal>
        <Reveal>
          <Steps steps={ASSISTANT} />
        </Reveal>
      </Split>
    </Section>
  );
}
